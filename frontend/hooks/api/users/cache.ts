import type { QueryClient } from "@tanstack/react-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";

export function invalidatePersonAccountAccess(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: directoryAndOwnershipQueryKeys.directory.peopleAll,
  });
}
