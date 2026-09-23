"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  RankTicketInput,
  ProjectWithDetails,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import {
  addTicketToCollections,
  invalidateBuildViews,
  patchTicketCollections,
  removeTicketFromCollections,
  restoreTicketCollections,
  rollbackTicketFields,
  type TicketSnapshots,
} from "./ticket-cache";
import { applyTicketPatch } from "./ticket-update-mutation";

const ticketRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-core-schema").then(
    (m) => m.ticketRowContract,
  ),
);

const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const rankTicketResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.rankTicketResultContract,
  ),
);

const bulkUpdateResultLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.bulkUpdateResultContract,
  ),
);

interface CreateTicketContext {
  tempId: number;
  listSnapshots: TicketSnapshots;
  subtasksKey: readonly unknown[] | null;
  previousSubtasks: Ticket[] | null;
}

export function useCreateTicket(
  options?: Omit<
    UseMutationOptions<Ticket, Error, CreateTicketInput, CreateTicketContext>,
    "mutationFn" | "mutationKey" | "onMutate"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    Ticket,
    Error,
    CreateTicketInput,
    CreateTicketContext
  >("build:tickets:create", {
    ...options,
    mutationKey: ["projects", "tickets", "create"],
    mutationFn: ({ projectId, ...data }) =>
      apiClient.post<Ticket>(
        `/build/${projectId}/tickets`,
        data,
        undefined,
        ticketRowLazy,
      ),
    onMutate: async (variables) => {
      const tempId = -Date.now();
      const subtasksKey =
        variables.parentTicketId !== undefined
          ? buildWorkQueryKeys.projects.subtasks(
              variables.parentTicketId,
              variables.projectId,
            )
          : null;
      await queryClient.cancelQueries({
        queryKey: buildWorkQueryKeys.projects.tickets({
          projectId: variables.projectId,
        }),
      });
      if (subtasksKey !== null)
        await queryClient.cancelQueries({ queryKey: subtasksKey });
      const previousSubtasks =
        subtasksKey !== null
          ? (queryClient.getQueryData<Ticket[]>(subtasksKey) ?? null)
          : null;
      const tempTicket: Ticket = {
        id: tempId,
        orgId: "",
        title: variables.title,
        description: variables.description,
        type: variables.type,
        status: variables.status ?? "TODO",
        priority: variables.priority ?? null,
        projectId: variables.projectId,
        ticketNumber: 0,
        epicId: variables.epicId ?? null,
        assigneeId: variables.assigneeId ?? null,
        reporterId: null,
        points: variables.points ?? null,
        storyPoints: null,
        link: null,
        rank: "",
        parentTicketId: variables.parentTicketId ?? null,
        originalEstimate: null,
        timeSpent: null,
        startDate: null,
        dueDate: variables.dueDate ?? null,
        moduleId: null,
        cycleId: variables.cycleId ?? null,
        sequenceId: null,
        estimate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignee: null,
      };
      const listSnapshots = addTicketToCollections(
        queryClient,
        variables.projectId,
        tempTicket,
      );
      if (subtasksKey !== null)
        queryClient.setQueryData<Ticket[]>(subtasksKey, (old) =>
          old ? [tempTicket, ...old] : [tempTicket],
        );
      return { tempId, listSnapshots, subtasksKey, previousSubtasks };
    },
    onSuccess: (data, variables, context, mutFnCtx) => {
      if (context) {
        void patchTicketCollections(queryClient, variables.projectId, (t) =>
          t.id === context.tempId ? data : t,
        );
        if (context.subtasksKey !== null)
          queryClient.setQueryData<Ticket[]>(context.subtasksKey, (old) =>
            old ? old.map((t) => (t.id === context.tempId ? data : t)) : [data],
          );
      }
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
    onError: (error, variables, context, mutFnCtx) => {
      if (context) {
        removeTicketFromCollections(
          queryClient,
          variables.projectId,
          context.tempId,
        );
        if (context.subtasksKey !== null)
          queryClient.setQueryData<Ticket[]>(
            context.subtasksKey,
            context.previousSubtasks !== null
              ? context.previousSubtasks
              : (old) => old?.filter((t) => t.id !== context.tempId),
          );
      }
      options?.onError?.(error, variables, context, mutFnCtx);
    },
    onSettled: (data, error, variables, context, mutFnCtx) => {
      invalidateBuildViews(queryClient, variables.projectId);
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}

export function useDeleteTicket(
  projectId: number,
  options?: Omit<
    UseMutationOptions<void, Error, { ticketId: number }>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, { ticketId: number }>(
    "build:tickets:delete",
    {
      ...options,
      mutationKey: ["projects", "tickets", "delete"],
      mutationFn: ({ ticketId }) =>
        apiClient.delete<void>(
          `/build/${projectId}/tickets/${ticketId}`,
          undefined,
          undefined,
          noContentLazy,
        ),
      onSuccess: (data, variables, context, mutFnCtx) => {
        invalidateBuildViews(queryClient, projectId, [variables.ticketId]);
        options?.onSuccess?.(data, variables, context, mutFnCtx);
      },
    },
  );
}

export interface RankTicketResponse {
  id: number;
  rank: string;
  status: string;
}

export function useRankTicket<TContext = unknown>(
  options?: Omit<
    UseMutationOptions<RankTicketResponse, Error, RankTicketInput, TContext>,
    "mutationFn" | "mutationKey"
  >,
) {
  const queryClient = useQueryClient();
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
    onSettled: (data, error, variables, context, mutationContext) => {
      invalidateBuildViews(
        queryClient,
        variables.projectId,
        [variables.ticketId],
        variables.status !== undefined,
      );
      options?.onSettled?.(data, error, variables, context, mutationContext);
    },
  });
}

export interface BulkUpdateTicketsInput {
  ticketIds: number[];
  assigneeId?: string;
  status?: string;
  cycleId?: number | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  parentTicketId?: number | null;
}

interface BulkUpdateTicketsContext {
  previousDetail: ProjectWithDetails | null | undefined;
  optimisticDetail: ProjectWithDetails | null | undefined;
  previousTickets: Map<number, Ticket | null | undefined>;
  optimisticTickets: Map<number, Ticket | null | undefined>;
  listSnapshots: TicketSnapshots;
}

function toTicketUpdateInput(
  ticketId: number,
  input: BulkUpdateTicketsInput,
): UpdateTicketInput {
  return {
    ticketId,
    assigneeId: input.assigneeId,
    status: input.status,
    cycleId: input.cycleId,
    priority: input.priority,
    parentTicketId: input.parentTicketId,
  };
}

export function useBulkUpdateTickets(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { updated: number; ticketIds: number[] },
    Error,
    BulkUpdateTicketsInput,
    BulkUpdateTicketsContext
  >("build:tickets:update", {
    mutationKey: ["projects", "tickets", "bulk-update"],
    mutationFn: (data: BulkUpdateTicketsInput) =>
      apiClient.post<{ updated: number; ticketIds: number[] }>(
        `/build/${projectId}/tickets/bulk`,
        data,
        undefined,
        bulkUpdateResultLazy,
      ),
    onMutate: async (variables) => {
      const detailKey = buildWorkQueryKeys.projects.detail(projectId);
      const ticketKeys = variables.ticketIds.map((ticketId) =>
        buildWorkQueryKeys.projects.ticket(ticketId),
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
              toTicketUpdateInput(ticket.id, variables),
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
        const queryKey = buildWorkQueryKeys.projects.ticket(ticketId);
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
          buildWorkQueryKeys.projects.ticket(ticketId),
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
