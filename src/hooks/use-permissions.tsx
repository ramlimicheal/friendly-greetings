import { useEffect, useMemo, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useClinic } from "@/hooks/use-clinic";
import { can, canAny, type Permission } from "@/lib/permissions";

export function usePermissions() {
  const { activeRole, isSuperAdmin, loading } = useClinic();
  return useMemo(
    () => ({
      role: activeRole,
      isSuperAdmin,
      loading,
      // Super admins bypass clinic permission checks (they use the platform portal).
      can: (a: Permission) => isSuperAdmin || can(activeRole, a),
      canAny: (a: Permission[]) => isSuperAdmin || canAny(activeRole, a),
    }),
    [activeRole, isSuperAdmin, loading],
  );
}

/** Redirect to `/` when the current user lacks the required permission. */
export function useRequirePermission(perm: Permission | Permission[]) {
  const { can: canDo, canAny: canAnyDo, loading, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const allowed = isSuperAdmin || (Array.isArray(perm) ? canAnyDo(perm) : canDo(perm));
  useEffect(() => {
    if (loading) return;
    if (!allowed) void navigate({ to: "/dashboard", replace: true });
  }, [loading, allowed, navigate]);
  return { allowed, loading };
}

/** Conditionally render children only if the user has the perm(s). */
export function Can({
  perm,
  fallback = null,
  children,
}: {
  perm: Permission | Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can: canDo, canAny: canAnyDo } = usePermissions();
  const ok = Array.isArray(perm) ? canAnyDo(perm) : canDo(perm);
  return <>{ok ? children : fallback}</>;
}
