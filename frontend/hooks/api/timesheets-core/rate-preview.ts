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
    queryFn: ({ signal }) =>
      apiClient.get<ResolvedRatePreview>("/timesheets/billing/rate-preview", params, signal),
    staleTime: 60_000,
    enabled: enabled && canView && (input.projectId != null || input.userId != null),
  });
}
