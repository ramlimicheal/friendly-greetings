import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "dentist" | "hygienist" | "front_desk";

export type StaffMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  roles: AppRole[];
  created_at: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, is_active, created_at")
      .order("created_at", { ascending: true });
    if (pErr) throw new Error(pErr.message);
    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);
    const roleMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role as AppRole);
      roleMap.set(r.user_id, list);
    });
    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      is_active: p.is_active,
      created_at: p.created_at,
      roles: roleMap.get(p.id) ?? [],
    })) as StaffMember[];
  });

export const listInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Invitation[];
  });

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; role: AppRole }) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email");
    const allowed: AppRole[] = ["admin", "dentist", "hygienist", "front_desk"];
    if (!allowed.includes(input.role)) throw new Error("Invalid role");
    return { email, role: input.role };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("invitations")
      .insert({ email: data.email, role: data.role, invited_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "invite.create",
      entity_type: "invitation",
      entity_id: row.id,
      metadata: { email: data.email, role: data.role },
    });
    return row as Invitation;
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("invitations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "invite.revoke",
      entity_type: "invitation",
      entity_id: data.id,
      metadata: {},
    });
    return { ok: true };
  });

export const updateStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; role: AppRole }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Replace all roles with the single selected role (simple model)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "staff.role_change",
      entity_type: "user",
      entity_id: data.user_id,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; is_active: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Prevent self-deactivation
    if (data.user_id === context.userId && !data.is_active) {
      throw new Error("You cannot deactivate your own account");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: data.is_active ? "staff.activate" : "staff.deactivate",
      entity_type: "user",
      entity_id: data.user_id,
      metadata: {},
    });
    return { ok: true };
  });

/** Public: look up an invitation by token — used on signup page to allow account creation. */
export const getInvitationByToken = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("invitations")
      .select("email, role, expires_at, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { valid: false as const, reason: "not_found" as const };
    if (row.used_at) return { valid: false as const, reason: "used" as const };
    if (new Date(row.expires_at).getTime() < Date.now())
      return { valid: false as const, reason: "expired" as const };
    return { valid: true as const, email: row.email, role: row.role as AppRole };
  });

export type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
};

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: logs, error } = await context.supabase
      .from("audit_log")
      .select("id, user_id, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = logs ?? [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    const nameMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      (profs ?? []).forEach((p) => nameMap.set(p.id, { full_name: p.full_name, email: p.email }));
    }
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      created_at: r.created_at,
      actor_name: r.user_id ? nameMap.get(r.user_id)?.full_name ?? null : null,
      actor_email: r.user_id ? nameMap.get(r.user_id)?.email ?? null : null,
    }));
  });


