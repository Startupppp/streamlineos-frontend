import { useMemo } from "react";
import { useAccess } from "../../hooks/api/access";

const EMPTY_PERMISSIONS: string[] = [];

export function usePermissions() {
  const { data: access, isLoading } = useAccess();

  const permissions = useMemo(
    () => access?.permissions ?? EMPTY_PERMISSIONS,
    [access?.permissions],
  );

  return useMemo(() => ({ permissions, isLoading }), [permissions, isLoading]);
}
