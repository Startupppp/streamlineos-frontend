"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";
import type { ResolvedRatePreview } from "@/features/timesheets/types";

export interface RatePreviewInput {
  projectId?: number;
  userId?: string;
  ticketId?: number;
  clientId?: number;
  date?: string;
}

/**
 * What would this combination actually bill at?
 *
 * `GET /timesheets/billing/rate-preview` runs the real resolver — the same one
 * that prices an entry when it is invoiced — so it answers the question rate
 * cards are hard to answer by reading: given overlapping cards with priorities
 * and effective windows, which one wins for this project and this person, and
 * did the card I just wrote actually take effect?
 *
 * Its query key had been declared in `lib/query-keys` and no hook ever used it,
 * the same half-finished shape as `settingsHistory`. So a rate card could be
 * written, and whether it applied could only be discovered by invoicing.
 */
export function useRatePreview(input: RatePreviewInput, enabled = true) {
  const canView = useCan("timesheets:billing:view");
  const params = {
    projectId: input.projectId,
    userId: input.userId,
    ticketId: input.ticketId,
    clientId: input.clientId,
    date: input.date,
  };
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.ratePreview(params),
    queryFn: () =>
      apiClient.get<ResolvedRatePreview>("/timesheets/billing/rate-preview", params),
    /*
     * Cheap and derived entirely from rate cards, which are edited on the same
     * screen — a rate mutation invalidates this prefix, so a long window costs
     * nothing and a stale answer would be the one thing that makes the control
     * useless.
     */
    staleTime: 60_000,
    enabled: enabled && canView && (input.projectId != null || input.userId != null),
  });
}
