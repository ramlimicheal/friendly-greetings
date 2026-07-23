import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy global-role type. Kept only as a type alias for historical imports.
 * All authorization now flows through clinic-scoped roles via
 * `useClinic()` / `usePermissions()`. Do NOT branch on `roles` for new code.
 */
export type AppRole = "admin" | "dentist" | "hygienist" | "front_desk";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active?: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (u: User | null) => {
      if (!u) {
        setProfile(null);
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_active")
        .eq("id", u.id)
        .maybeSingle();
      if (!mounted) return;
      setProfile((p as Profile) ?? null);
    };

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      void load(data.user).finally(() => mounted && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void load(nextUser);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
