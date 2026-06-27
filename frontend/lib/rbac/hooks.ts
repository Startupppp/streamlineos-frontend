import { useSession } from "next-auth/react";
import { useAccess } from "../api/hooks/access";

export function usePermissions() {
  const { data: session } = useSession();
  const { data: access, isLoading } = useAccess({
    enabled: !!session?.user?.id,
  });

  return {
    permissions: access?.permissions ?? session?.permissions ?? [],
    isLoading,
  };
}
