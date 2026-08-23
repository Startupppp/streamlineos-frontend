import { useMemo } from "react";
import { useAccess } from "../../hooks/api/access";

const EMPTY_PERMISSIONS: string[] = [];

export function usePermissions() {
  const { data: access, isLoading } = useAccess();

  const permissions = useMemo(
    () => (access ? Object.keys(access.scopes) : EMPTY_PERMISSIONS),
    [access?.scopes],
  );

  return useMemo(() => ({ permissions, isLoading }), [permissions, isLoading]);
}
