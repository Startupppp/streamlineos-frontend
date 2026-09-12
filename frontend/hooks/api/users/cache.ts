import type { QueryClient } from "@tanstack/react-query";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";

export function invalidatePersonAccountAccess(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: directoryAndOwnershipQueryKeys.directory.peopleAll,
  });
}

export function invalidateCalendarMemberLookups(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: platformHierarchyQueryKeys.calendar.orgMembersAll,
  });
  void queryClient.invalidateQueries({
    queryKey: platformHierarchyQueryKeys.calendar.memberSearchAll,
  });
}
