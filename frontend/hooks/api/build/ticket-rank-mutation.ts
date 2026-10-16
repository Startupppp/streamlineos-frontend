"use client";

import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { Ticket, RankTicketInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { patchTicketCollections, resolveTicketStatus } from "./ticket-cache";
import { invalidateTicketUpdateViews } from "./ticket-cache-invalidation";

const rankTicketResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.rankTicketResultContract,
  ),
);

interface RankTicketResponse {
  id: number;
  rank: string;
  status: string;
  version: number;
}

export function useRankTicket<TContext = unknown>(
  options?: Omit<
    UseMutationOptions<RankTicketResponse, Error, RankTicketInput, TContext>,
    "mutationFn" | "mutationKey"
  >,
) {
  const queryClient = useQueryClient();
  const priorStatuses = useRef(new Map<number, string>());
  const callerOnMutate = options?.onMutate;
  return useAuthorizedMutation<
    RankTicketResponse,
    Error,
    RankTicketInput,
    TContext
  >("build:tickets:update", {
    ...options,
    mutationKey: ["projects", "tickets", "rank"],
    mutationFn: ({ projectId, ticketId, ...data }) =>
      apiClient.patch<RankTicketResponse>(
        `/build/${projectId}/tickets/${ticketId}/rank`,
        data,
        undefined,
        rankTicketResultLazy,
      ),
    onMutate: callerOnMutate && ((variables, mutationContext) => {
      const status = resolveTicketStatus(queryClient, variables.projectId, variables.ticketId);
      if (status) priorStatuses.current.set(variables.ticketId, status);
      return callerOnMutate(variables, mutationContext);
    }),
    onSuccess: (data, variables, context, mutationContext) => {
      const prevStatus = priorStatuses.current.get(variables.ticketId)
        ?? resolveTicketStatus(queryClient, variables.projectId, variables.ticketId);
      const applyServerRank = (ticket: Ticket) =>
        ticket.id === data.id
          ? { ...ticket, rank: data.rank, status: data.status, version: data.version }
          : ticket;
      patchTicketCollections(queryClient, variables.projectId, applyServerRank);
      queryClient.setQueryData<Ticket | null>(
        buildWorkQueryKeys.projects.ticket(variables.projectId, data.id),
        (current) => (current ? applyServerRank(current) : current),
      );
      if (prevStatus && prevStatus !== data.status) {
        for (const [key, counts] of queryClient.getQueriesData<Record<string, number>>({
          queryKey: buildWorkQueryKeys.projects.columnCounts(variables.projectId),
        })) {
          if (!counts) continue;
          queryClient.setQueryData<Record<string, number>>(key, {
            ...counts,
            [prevStatus]: Math.max(0, (counts[prevStatus] ?? 0) - 1),
            [data.status]: (counts[data.status] ?? 0) + 1,
          });
        }
      }
      options?.onSuccess?.(data, variables, context, mutationContext);
    },
    onSettled: (data, error, variables, context, mutationContext) => {
      priorStatuses.current.delete(variables.ticketId);
      invalidateTicketUpdateViews(
        queryClient,
        variables.projectId,
        variables.ticketId,
        { status: variables.status },
      );
      options?.onSettled?.(data, error, variables, context, mutationContext);
    },
  });
}
