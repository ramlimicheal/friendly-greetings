import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    // Check account is active + active clinic
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, active_clinic_id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { deactivated: "1" } as never });
    }
    // If this user is a patient portal user (not staff), redirect them to /portal
    const { data: portalLink } = await supabase
      .from("patient_portal_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (portalLink) throw redirect({ to: "/portal" });

    // If they have no active clinic AND they are not already on the onboarding page,
    // send them to onboarding. Membership check keeps super_admins / support out of the loop.
    const p = profile as { is_active: boolean | null; active_clinic_id: string | null } | null;
    if (!p?.active_clinic_id && location.pathname !== "/onboarding") {
      const { count } = await supabase
        .from("clinic_members")
        .select("clinic_id", { count: "exact", head: true })
        .eq("user_id", data.user.id)
        .eq("is_active", true);
      if (!count) throw redirect({ to: "/onboarding" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
