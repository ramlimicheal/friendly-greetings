import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PlatformClinic = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
  chair_count: number;
  timezone: string;
  city: string | null;
  country: string | null;
  created_at: string;
  organization_id: string;
  organization_name: string | null;
  member_count: number;
  patient_count: number;
  appointment_count: number;
};

export type PlatformOrganization = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  clinic_count: number;
};

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.platform_role !== "super_admin") {
    throw new Error("Forbidden: super_admin required");
  }
}

export const listPlatformClinics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinics, error } = await supabaseAdmin
      .from("clinics")
      .select("id, name, slug, is_active, chair_count, timezone, city, country, created_at, organization_id, organizations:organization_id(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (clinics ?? []).map((c: any) => c.id);
    const statsMap = new Map<string, { member_count: number; patient_count: number; appointment_count: number }>();
    if (ids.length > 0) {
      const { data: stats, error: sErr } = await context.supabase.rpc("platform_clinic_stats", { _clinic_ids: ids });
      if (sErr) throw new Error(sErr.message);
      (stats ?? []).forEach((s: any) =>
        statsMap.set(s.clinic_id, {
          member_count: Number(s.member_count ?? 0),
          patient_count: Number(s.patient_count ?? 0),
          appointment_count: Number(s.appointment_count ?? 0),
        }),
      );
    }

    return (clinics ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      is_active: c.is_active,
      chair_count: c.chair_count,
      timezone: c.timezone,
      city: c.city,
      country: c.country,
      created_at: c.created_at,
      organization_id: c.organization_id,
      organization_name: c.organizations?.name ?? null,
      member_count: statsMap.get(c.id)?.member_count ?? 0,
      patient_count: statsMap.get(c.id)?.patient_count ?? 0,
      appointment_count: statsMap.get(c.id)?.appointment_count ?? 0,
    })) as PlatformClinic[];
  });


export const listPlatformOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: clinics } = await supabaseAdmin.from("clinics").select("organization_id");
    const tally = new Map<string, number>();
    (clinics ?? []).forEach((c: any) => tally.set(c.organization_id, (tally.get(c.organization_id) ?? 0) + 1));
    return (orgs ?? []).map((o: any) => ({
      ...o,
      clinic_count: tally.get(o.id) ?? 0,
    })) as PlatformOrganization[];
  });

export const setClinicActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clinic_id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_active: data.is_active })
      .eq("id", data.clinic_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createPlatformClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        organization_id: z.string().uuid().optional(),
        new_organization_name: z.string().min(2).optional(),
        name: z.string().min(2),
        slug: z.string().min(2).optional(),
        timezone: z.string().default("America/New_York"),
        chair_count: z.number().int().min(1).max(50).default(4),
        city: z.string().optional(),
        country: z.string().optional(),
      })
      .refine((v) => v.organization_id || v.new_organization_name, {
        message: "organization_id or new_organization_name required",
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let orgId = data.organization_id ?? null;
    if (!orgId) {
      const slug = (data.new_organization_name ?? "org")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const { data: org, error: oErr } = await supabaseAdmin
        .from("organizations")
        .insert({ name: data.new_organization_name!, slug })
        .select("id")
        .single();
      if (oErr) throw new Error(oErr.message);
      orgId = org.id;
    }
    const { data: clinic, error } = await supabaseAdmin
      .from("clinics")
      .insert({
        organization_id: orgId!,
        name: data.name,
        slug: data.slug ?? data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        timezone: data.timezone,
        chair_count: data.chair_count,
        city: data.city ?? null,
        country: data.country ?? null,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, clinic_id: clinic.id };
  });

export const impersonateClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clinic_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ active_clinic_id: data.clinic_id })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      clinic_id: data.clinic_id,
      action: "platform.impersonate_clinic",
      entity_type: "clinic",
      entity_id: data.clinic_id,
      metadata: {},
    });
    return { ok: true };
  });
