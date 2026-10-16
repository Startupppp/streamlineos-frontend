"use client";

import { useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
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

interface StatusMove {
  from: string;
  to: string;
}

/** Move one ticket's worth of count between two status columns, in every filtered count cache. */
function shiftColumnCount(
  queryClient: QueryClient,
  projectId: number,
  from: string,
  to: string,
) {
  if (from === to) return;
  for (const [key, counts] of queryClient.getQueriesData<Record<string, number>>({
    queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
  })) {
    if (!counts) continue;
    queryClient.setQueryData<Record<string, number>>(key, {
      ...counts,
      [from]: Math.max(0, (counts[from] ?? 0) - 1),
      [to]: (counts[to] ?? 0) + 1,
    });
  }
}

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
  const moves = useRef(new Map<number, StatusMove>());
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
    // The column counts move with the card, before the server answers (B-028);
    // the source status must be read before the caller's onMutate re-statuses
    // the ticket in cache.
    onMutate: (variables, mutationContext) => {
      const from = resolveTicketStatus(queryClient, variables.projectId, variables.ticketId);
      if (from) {
        const to = variables.status ?? from;
        moves.current.set(variables.ticketId, { from, to });
        shiftColumnCount(queryClient, variables.projectId, from, to);
      }
      // No caller onMutate means no caller context; TanStack passes undefined through.
      return callerOnMutate
        ? callerOnMutate(variables, mutationContext)
        : (undefined as TContext);
    },
    onSuccess: (data, variables, context, mutationContext) => {
      const move = moves.current.get(variables.ticketId);
      const applyServerRank = (ticket: Ticket) =>
        ticket.id === data.id
          ? { ...ticket, rank: data.rank, status: data.status, version: data.version }
          : ticket;
      patchTicketCollections(queryClient, variables.projectId, applyServerRank);
      queryClient.setQueryData<Ticket | null>(
        buildWorkQueryKeys.projects.ticket(variables.projectId, data.id),
        (current) => (current ? applyServerRank(current) : current),
      );
      if (move) shiftColumnCount(queryClient, variables.projectId, move.to, data.status);
      options?.onSuccess?.(data, variables, context, mutationContext);
    },
    onError: (error, variables, context, mutationContext) => {
      const move = moves.current.get(variables.ticketId);
      if (move) shiftColumnCount(queryClient, variables.projectId, move.to, move.from);
      options?.onError?.(error, variables, context, mutationContext);
    },
    onSettled: (data, error, variables, context, mutationContext) => {
      moves.current.delete(variables.ticketId);
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
