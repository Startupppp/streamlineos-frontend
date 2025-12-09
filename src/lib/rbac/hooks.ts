import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRbacUserPermissions } from "@/lib/hooks/trpc-hooks";

export function usePermissions() {
  const { user } = useUser();
  const { data: userPermissions } = useRbacUserPermissions({
    enabled: !!user
  });

  const hasPermission = useMemo(
    () => (permission: string) => {
      if (!userPermissions) return false;
      return userPermissions.includes(permission);
    },
    [userPermissions]
  );

  const hasAnyPermission = useMemo(
    () => (permissions: string[]) => {
      if (!userPermissions) return false;
      return permissions.some((perm) => userPermissions.includes(perm));
    },
    [userPermissions]
  );

  const hasAllPermissions = useMemo(
    () => (permissions: string[]) => {
      if (!userPermissions) return false;
      return permissions.every((perm) => userPermissions.includes(perm));
    },
    [userPermissions]
  );

  return {
    permissions: userPermissions ?? [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading: !userPermissions,
  };
}

