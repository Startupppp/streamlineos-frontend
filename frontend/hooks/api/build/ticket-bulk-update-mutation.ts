"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Ticket,
  UpdateTicketInput,
  ProjectWithDetails,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import {
  patchTicketCollections,
  restoreTicketCollections,
  resolveTicketVersions,
  rollbackTicketFields,
  type TicketSnapshots,
} from "./ticket-cache";
import { invalidateBuildViews } from "./ticket-cache-invalidation";
import { applyTicketPatch } from "./ticket-update-mutation";

const bulkUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.bulkUpdateResultContract,
  ),
);

export interface BulkUpdateTicketsInput {
  ticketIds: number[];
  assigneeId?: string;
  status?: string;
  cycleId?: number | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  parentTicketId?: number | null;
  labelIds?: number[];
  archive?: boolean;
  versions: Record<string, number>;
}

export type BulkUpdateTicketsVariables = Omit<BulkUpdateTicketsInput, "versions">;

export interface BulkUpdateBlockedTicket {
  ticketId: number;
  reason: string;
  dependencyCount: number;
}

export interface BulkUpdateTicketsResult {
  updated: number;
  ticketIds: number[];
  blocked?: BulkUpdateBlockedTicket[];
}

interface BulkUpdateTicketsContext {
  previousDetail: ProjectWithDetails | null | undefined;
  optimisticDetail: ProjectWithDetails | null | undefined;
  previousTickets: Map<number, Ticket | null | undefined>;
  optimisticTickets: Map<number, Ticket | null | undefined>;
  listSnapshots: TicketSnapshots;
}

function toTicketUpdateInput(
  ticket: Ticket,
  input: BulkUpdateTicketsVariables,
): UpdateTicketInput {
  return {
    ticketId: ticket.id,
    version: ticket.version,
    assigneeId: input.assigneeId,
    status: input.status,
    cycleId: input.cycleId,
    priority: input.priority,
    parentTicketId: input.parentTicketId,
  };
}

function attachTicketVersions(
  queryClient: QueryClient,
  projectId: number,
  variables: BulkUpdateTicketsVariables,
): BulkUpdateTicketsInput {
  const { versions, missingTicketIds } = resolveTicketVersions(
    queryClient,
    projectId,
    variables.ticketIds,
  );
  if (missingTicketIds.length > 0) {
    throw new Error(
      `Bulk ticket update blocked: no cached optimistic-concurrency version for ticket id(s) ${missingTicketIds.join(", ")}. Reload the list before retrying.`,
    );
  }
  return { ...variables, versions };
}

export function useBulkUpdateTickets(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    BulkUpdateTicketsResult,
    Error,
    BulkUpdateTicketsVariables,
    BulkUpdateTicketsContext
  >("build:tickets:update", {
    mutationKey: ["projects", "tickets", "bulk-update"],
    mutationFn: (data: BulkUpdateTicketsVariables) =>
      apiClient.post<BulkUpdateTicketsResult>(
        `/build/${projectId}/tickets/bulk`,
        attachTicketVersions(queryClient, projectId, data),
        undefined,
        bulkUpdateResultLazy,
      ),
    onMutate: async (variables) => {
      if (variables.archive || variables.labelIds !== undefined) {
        return {
          previousDetail: undefined,
          optimisticDetail: undefined,
          previousTickets: new Map<number, Ticket | null | undefined>(),
          optimisticTickets: new Map<number, Ticket | null | undefined>(),
          listSnapshots: [],
        };
      }
      const detailKey = buildWorkQueryKeys.projects.detail(projectId);
      const ticketKeys = variables.ticketIds.map((ticketId) =>
        buildWorkQueryKeys.projects.ticket(projectId, ticketId),
      );
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
        }),
        queryClient.cancelQueries({ queryKey: detailKey }),
        ...ticketKeys.map((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        ),
      ]);
      const previousDetail =
        queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
      const members = previousDetail?.members ?? [];
      const selected = new Set(variables.ticketIds);
      const patch = (ticket: Ticket) =>
        selected.has(ticket.id)
          ? applyTicketPatch(
              ticket,
              toTicketUpdateInput(ticket, variables),
              members,
            )
          : ticket;
      const listSnapshots = patchTicketCollections(
        queryClient,
        projectId,
        patch,
      );
      if (previousDetail?.tickets) {
        queryClient.setQueryData<ProjectWithDetails | null>(detailKey, {
          ...previousDetail,
          tickets: previousDetail.tickets.map(patch),
        });
      }
      const previousTickets = new Map<number, Ticket | null | undefined>();
      const optimisticTickets = new Map<number, Ticket | null | undefined>();
      for (const ticketId of variables.ticketIds) {
        const queryKey = buildWorkQueryKeys.projects.ticket(projectId, ticketId);
        const previous = queryClient.getQueryData<Ticket | null>(queryKey);
        previousTickets.set(ticketId, previous);
        if (previous) queryClient.setQueryData(queryKey, patch(previous));
        optimisticTickets.set(
          ticketId,
          queryClient.getQueryData<Ticket | null>(queryKey),
        );
      }
      return {
        previousDetail,
        optimisticDetail: queryClient.getQueryData<ProjectWithDetails | null>(
          detailKey,
        ),
        previousTickets,
        optimisticTickets,
        listSnapshots,
      };
    },
    onError: (_error, variables, context) => {
      if (!context) return;
      restoreTicketCollections(queryClient, context.listSnapshots);
      const detailKey = buildWorkQueryKeys.projects.detail(projectId);
      if (context.previousDetail && context.optimisticDetail) {
        queryClient.setQueryData<ProjectWithDetails | null>(
          detailKey,
          (current) => {
            if (!current?.tickets) return current;
            const previousById = new Map(
              context.previousDetail?.tickets?.map((ticket) => [
                ticket.id,
                ticket,
              ]) ?? [],
            );
            const optimisticById = new Map(
              context.optimisticDetail?.tickets?.map((ticket) => [
                ticket.id,
                ticket,
              ]) ?? [],
            );
            return {
              ...current,
              tickets: current.tickets.map((ticket) => {
                const previous = previousById.get(ticket.id);
                const optimistic = optimisticById.get(ticket.id);
                return previous && optimistic
                  ? rollbackTicketFields(ticket, previous, optimistic)
                  : ticket;
              }),
            };
          },
        );
      }
      for (const ticketId of variables.ticketIds) {
        const previous = context.previousTickets.get(ticketId);
        const optimistic = context.optimisticTickets.get(ticketId);
        if (!previous || !optimistic) continue;
        queryClient.setQueryData<Ticket | null>(
          buildWorkQueryKeys.projects.ticket(projectId, ticketId),
          (current) =>
            current
              ? rollbackTicketFields(current, previous, optimistic)
              : current,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      invalidateBuildViews(queryClient, projectId, variables.ticketIds);
    },
  });
}
