"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCan } from "@/hooks/api/access";
import type { CursorResponse } from "@/hooks/api/org-hierarchy";
import type { OrgBranch } from "@/types/org-hierarchy";
import { lazyContract } from "@/lib/api-envelope";

const orgBranchListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.orgBranchListContract),
);

export const BRANCH_OPTIONS_PAGE_SIZE = 100;

// The dropdown feed: `branch:view` rather than the settings surface's `settings:view`, and the route serves ACTIVE branches only.
export function useBranchOptions(
  options?: Omit<
    UseQueryOptions<CursorResponse<OrgBranch>, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const canView = useCan("branch:view");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.hierarchy.branchOptions(),
    queryFn: ({ signal }) =>
      apiClient.get<CursorResponse<OrgBranch>>(
        "/org-hierarchy/branches/options",
        { limit: String(BRANCH_OPTIONS_PAGE_SIZE) },
        signal,
        orgBranchListContract,
      ),
    staleTime: 30 * 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}
