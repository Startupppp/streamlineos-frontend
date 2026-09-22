"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";
import type {
  OverdueQueryInput,
  OverdueQueueResult,
} from "@/features/timesheets/types";

export const OVERDUE_PAGE_SIZE = 25;

export function useOverduePeriods(query: OverdueQueryInput = {}) {
  const canView = useCan("timesheets:approvals:view");
  const params = {
    userId: query.userId,
    asOf: query.asOf,
    page: query.page ?? 1,
    limit: query.limit ?? OVERDUE_PAGE_SIZE,
  };
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.periodsOverdue(params),
    queryFn: ({ signal }) =>
      apiClient.get<OverdueQueueResult>("/timesheets/periods/overdue", params, signal),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: canView,
  });
}
