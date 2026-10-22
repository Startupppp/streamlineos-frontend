import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";

export function moduleMyPermissionsQueryOptions(moduleKey: string) {
  return {
    queryKey: directoryAndOwnershipQueryKeys.moduleAccess.myPermissions(moduleKey),
    staleTime: 30_000,
  } as const;
}
