"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  OverdueQueryInput,
  OverdueQueueResult,
} from "@/features/timesheets/types";

/**
 * TS-11. The overdue queue, read.
 *
 * `GET /timesheets/periods/overdue` has existed with no caller: the grace days
 * and reminder rules were read by the nightly sweep to decide whom to email,
 * and by nobody else — so the people who were late got told and the person
 * responsible for chasing them could not see the list. This hook is the caller
 * that endpoint was written for.
 *
 * Server-paginated, because the response carries a real `total` from a window
 * function and an organisation coming back from a quiet quarter can have
 * hundreds of late periods. The backend caps `limit` at 100.
 */
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
    queryKey: queryKeys.timesheets.periodsOverdue(params),
    queryFn: () =>
      apiClient.get<OverdueQueueResult>("/timesheets/periods/overdue", params),
    /**
     * A queue somebody is working through, not a live counter. The underlying
     * arithmetic only changes when a period is submitted or the policy is
     * edited, and both of those invalidate through their own mutations.
     */
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: canView,
  });
}
