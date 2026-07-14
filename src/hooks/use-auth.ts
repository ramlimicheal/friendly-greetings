import { useEffect, useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (u: User | null) => {
      if (!u) {
        setProfile(null);
        setRoles([]);
        return;
      }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, is_active")
          .eq("id", u.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.id),
      ]);
      if (!mounted) return;
      setProfile((p as Profile) ?? null);
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
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

  const helpers = useMemo(
    () => ({
      hasRole: (r: AppRole) => roles.includes(r),
      hasAnyRole: (rs: AppRole[]) => rs.some((r) => roles.includes(r)),
      isAdmin: roles.includes("admin"),
      isClinical: roles.some((r) => r === "admin" || r === "dentist" || r === "hygienist"),
    }),
    [roles],
  );

  return { user, profile, roles, loading, ...helpers };
}
