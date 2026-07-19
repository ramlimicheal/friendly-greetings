import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedGate,
});

function AuthenticatedGate() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active, active_clinic_id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        if (!cancelled) navigate({ to: "/auth", search: { deactivated: "1" } as never, replace: true });
        return;
      }

      const { data: portalLink } = await supabase
        .from("patient_portal_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (cancelled) return;

      if (portalLink) {
        navigate({ to: "/portal", replace: true });
        return;
      }

      const activeClinicId = (profile as { active_clinic_id: string | null } | null)?.active_clinic_id;
      if (!activeClinicId && window.location.pathname !== "/onboarding") {
        const { count } = await supabase
          .from("clinic_members")
          .select("clinic_id", { count: "exact", head: true })
          .eq("user_id", data.user.id)
          .eq("is_active", true);
        if (cancelled) return;
        if (!count) {
          navigate({ to: "/onboarding", replace: true });
          return;
        }
      }

      setAuthorized(true);
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!authorized) {
    return <div className="min-h-screen bg-background text-foreground" />;
  }

  return <Outlet />;
}
