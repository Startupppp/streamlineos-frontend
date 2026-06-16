import { useSession } from "next-auth/react";
import { useUserPermissions } from "../api/hooks/rbac";

export function usePermissions() {
  const { data: session } = useSession();
  const { data: userPermissions } = useUserPermissions({
    enabled: !!session?.user?.id,
  });

  return {
    permissions: userPermissions ?? [],
    isLoading: !userPermissions,
  };
}
