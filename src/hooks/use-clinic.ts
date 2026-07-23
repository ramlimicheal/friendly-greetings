import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ClinicRole =
  | "owner"
  | "admin"
  | "dentist"
  | "hygienist"
  | "assistant"
  | "front_desk"
  | "billing_specialist"
  | "read_only_auditor";

export type Membership = {
  clinic_id: string;
  role: ClinicRole;
  clinic: { id: string; name: string; slug: string | null; organization_id: string };
};

export function useClinic() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeClinicId, setActiveClinicId] = useState<string | null>(null);
  const [platformRole, setPlatformRole] = useState<"super_admin" | "support_agent" | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setMemberships([]);
      setActiveClinicId(null);
      setPlatformRole(null);
      setLoading(false);
      return;
    }
    const [{ data: profile }, { data: mems }] = await Promise.all([
      supabase
        .from("profiles")
        .select("active_clinic_id, platform_role")
        .eq("id", u.user.id)
        .maybeSingle(),
      supabase
        .from("clinic_members")
        .select("clinic_id, role, clinic:clinics(id, name, slug, organization_id)")
        .eq("user_id", u.user.id)
        .eq("is_active", true),
    ]);
    const list = ((mems ?? []) as unknown as Membership[]).filter((m) => m.clinic);
    setMemberships(list);
    // Narrow the raw profile shape (typegen doesn't yet have platform_role/active_clinic_id typed).
    const p = profile as { active_clinic_id: string | null; platform_role: "super_admin" | "support_agent" | null } | null;
    setPlatformRole(p?.platform_role ?? null);
    let active = p?.active_clinic_id ?? null;
    // Self-heal: if the stored active clinic isn't in memberships, fall back to first membership.
    if (!active || !list.some((m) => m.clinic_id === active)) {
      active = list[0]?.clinic_id ?? null;
      if (active) {
        await supabase.rpc("switch_active_clinic", { _clinic_id: active });
      }
    }
    setActiveClinicId(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const switchClinic = useCallback(
    async (clinicId: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await supabase.rpc("switch_active_clinic", { _clinic_id: clinicId });
      if (error) throw error;
      setActiveClinicId(clinicId);
      // Full reload so every query re-runs under the new clinic RLS scope.
      window.location.reload();
    },
    [],
  );

  const activeMembership = memberships.find((m) => m.clinic_id === activeClinicId) ?? null;

  return {
    loading,
    memberships,
    activeClinicId,
    activeClinic: activeMembership?.clinic ?? null,
    activeRole: activeMembership?.role ?? null,
    platformRole,
    isSuperAdmin: platformRole === "super_admin",
    switchClinic,
    reload: load,
  };
}
