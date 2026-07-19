import { useMemo } from "react";
import { useClinic } from "@/hooks/use-clinic";
import { can, canAny, type Permission } from "@/lib/permissions";

export function usePermissions() {
  const { activeRole, isSuperAdmin } = useClinic();
  return useMemo(
    () => ({
      role: activeRole,
      isSuperAdmin,
      // Super admins bypass clinic permission checks (they use the platform portal).
      can: (a: Permission) => isSuperAdmin || can(activeRole, a),
      canAny: (a: Permission[]) => isSuperAdmin || canAny(activeRole, a),
    }),
    [activeRole, isSuperAdmin],
  );
}
