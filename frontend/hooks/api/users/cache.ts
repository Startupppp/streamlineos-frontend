import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function invalidatePersonAccountAccess(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.directory.peopleAll,
  });
}
