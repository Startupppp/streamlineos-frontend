import { useAccess } from "../../hooks/api/access";

export function usePermissions() {
  const { data: access, isLoading } = useAccess();

  return {
    permissions: access?.permissions ?? [],
    isLoading,
  };
}
