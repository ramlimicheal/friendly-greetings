import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClinicRole =
  | "owner"
  | "admin"
  | "dentist"
  | "hygienist"
  | "assistant"
  | "front_desk"
  | "billing_specialist"
  | "read_only_auditor";

export type StaffMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: ClinicRole;
  is_active: boolean;
  created_at: string;
};

export type Invitation = {
  id: string;
  email: string;
  clinic_role: ClinicRole;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  invited_by: string | null;
  created_at: string;
};

const clinicIdValidator = (input: { clinic_id: string }) => {
  const id = String(input?.clinic_id ?? "").trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) throw new Error("Invalid clinic id");
  return { clinic_id: id };
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(clinicIdValidator)
  .handler(async ({ data, context }): Promise<StaffMember[]> => {
    const { data: rows, error } = await context.supabase.rpc("list_clinic_staff", {
      _clinic_id: data.clinic_id,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as StaffMember[];
  });

export const listInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(clinicIdValidator)
  .handler(async ({ data, context }): Promise<Invitation[]> => {
    const { data: rows, error } = await context.supabase.rpc("list_clinic_invitations", {
      _clinic_id: data.clinic_id,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Invitation[];
  });

// ---------------------------------------------------------------------------
// Invitation lifecycle
// ---------------------------------------------------------------------------

/** Returns the raw token exactly once — surface it immediately to the caller. */
export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinic_id: string; email: string; role: ClinicRole }) => {
    const id = String(input?.clinic_id ?? "").trim();
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) throw new Error("Invalid clinic id");
    const email = String(input?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email");
    const allowed: ClinicRole[] = [
      "owner",
      "admin",
      "dentist",
      "hygienist",
      "assistant",
      "front_desk",
      "billing_specialist",
      "read_only_auditor",
    ];
    if (!allowed.includes(input.role)) throw new Error("Invalid role");
    return { clinic_id: id, email, role: input.role };
  })
  .handler(async ({ data, context }): Promise<{ id: string; raw_token: string }> => {
    const { data: rows, error } = await context.supabase.rpc("create_clinic_invitation", {
      _clinic_id: data.clinic_id,
      _email: data.email,
      _role: data.role,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.id || !row?.raw_token) throw new Error("Invitation creation failed");
    return { id: row.id as string, raw_token: row.raw_token as string };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) throw new Error("Invalid invitation id");
    return { id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("revoke_clinic_invitation", {
      _invitation_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public — safe to call before signup. Returns only email + role, never IDs. */
export const peekInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "").trim();
    if (token.length < 16) throw new Error("Invalid token");
    return { token };
  })
  .handler(
    async ({ data }): Promise<
      | { valid: true; email: string; role: ClinicRole }
      | { valid: false; reason: "not_found" | "used" | "revoked" | "expired" | "invalid" }
    > => {
      // Use the unauthenticated Supabase client — this RPC is granted to anon.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: rows, error } = await supabase.rpc("peek_clinic_invitation", {
        _raw_token: data.token,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.valid) {
        const reason =
          (row?.reason as "not_found" | "used" | "revoked" | "expired" | "invalid" | undefined) ??
          "not_found";
        return { valid: false, reason };
      }
      return { valid: true, email: row.email as string, role: row.role as ClinicRole };
    },
  );

export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "").trim();
    if (token.length < 16) throw new Error("Invalid token");
    return { token };
  })
  .handler(async ({ data, context }): Promise<{ clinic_id: string; role: ClinicRole }> => {
    const { data: rows, error } = await context.supabase.rpc("accept_clinic_invitation", {
      _raw_token: data.token,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.clinic_id) throw new Error("Acceptance failed");
    // Set the accepted clinic as the caller's active clinic.
    await context.supabase.rpc("switch_active_clinic", { _clinic_id: row.clinic_id });
    return { clinic_id: row.clinic_id as string, role: row.role as ClinicRole };
  });

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

export const updateStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clinic_id: string; user_id: string; role: ClinicRole }) => {
    if (!/^[0-9a-fA-F-]{36}$/.test(input?.clinic_id ?? "")) throw new Error("Invalid clinic id");
    if (!/^[0-9a-fA-F-]{36}$/.test(input?.user_id ?? "")) throw new Error("Invalid user id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_clinic_member_role", {
      _clinic_id: data.clinic_id,
      _user_id: data.user_id,
      _role: data.role,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { clinic_id: string; user_id: string; is_active: boolean }) => {
      if (!/^[0-9a-fA-F-]{36}$/.test(input?.clinic_id ?? "")) throw new Error("Invalid clinic id");
      if (!/^[0-9a-fA-F-]{36}$/.test(input?.user_id ?? "")) throw new Error("Invalid user id");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId && !data.is_active) {
      throw new Error("You cannot deactivate your own membership");
    }
    const { error } = await context.supabase.rpc("set_clinic_member_active", {
      _clinic_id: data.clinic_id,
      _user_id: data.user_id,
      _active: data.is_active,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Audit log — scoped to the caller's active clinic via RLS on audit_log.
// ---------------------------------------------------------------------------

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

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(clinicIdValidator)
  .handler(async ({ data, context }): Promise<AuditRow[]> => {
    // Verify caller is an owner/admin of the clinic before returning anything.
    // list_clinic_staff performs that check and errors otherwise.
    await context.supabase.rpc("list_clinic_staff", { _clinic_id: data.clinic_id });

    const { data: logs, error } = await context.supabase
      .from("audit_log")
      .select("id, user_id, action, entity_type, entity_id, created_at")
      .eq("clinic_id", data.clinic_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = logs ?? [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
    const nameMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      // Lookup names via profiles RPC-safe fallback: only clinic members' profiles
      // are visible under Stage A RLS, so join through clinic_members.
      const { data: members } = await context.supabase
        .from("clinic_members")
        .select("user_id")
        .eq("clinic_id", data.clinic_id)
        .in("user_id", userIds);
      const memberIds = new Set((members ?? []).map((m) => m.user_id));
      const visibleIds = userIds.filter((id) => memberIds.has(id));
      if (visibleIds.length > 0) {
        const { data: profs } = await context.supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", visibleIds);
        (profs ?? []).forEach((p) =>
          nameMap.set(p.id, { full_name: p.full_name, email: p.email }),
        );
      }
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
