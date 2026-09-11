"use client";

import type { z } from "zod";
import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { commentPermalinkContract as commentPermalinkContractDef } from "@/hooks/api/build/build-tickets-schema";

const ticketDetailLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.ticketDetailContract),
);

export const commentPermalinkLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.commentPermalinkContract),
);

export type CommentPermalinkData = z.infer<typeof commentPermalinkContractDef>;

export interface TicketPermalinkData {
  id: number;
  title: string;
  status: string;
  priority: string;
  ticketNumber: number;
  projectId: number | null;
  projectKey?: string;
}

export function ticketPermalinkQueryOptions(projectId: number, ticketId: number) {
  return queryOptions<TicketPermalinkData>({
    queryKey: buildWorkQueryKeys.projects.commentPermalinkTicket(projectId, ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketPermalinkData>(`/build/${projectId}/tickets/${ticketId}`, undefined, signal, ticketDetailLazy),
    staleTime: 60_000,
    retry: false,
  });
}
