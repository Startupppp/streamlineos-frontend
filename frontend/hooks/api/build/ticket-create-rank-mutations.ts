"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Ticket,
  CreateTicketInput,
  RankTicketInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import {
  addTicketToCollections,
  invalidateBuildViews,
  invalidateTicketUpdateViews,
  patchTicketCollections,
  removeTicketFromCollections,
  type TicketSnapshots,
} from "./ticket-cache";

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
        version: 1,
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
  version: number;
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
    onSuccess: (data, variables, context, mutationContext) => {
      const applyServerRank = (ticket: Ticket) =>
        ticket.id === data.id
          ? { ...ticket, rank: data.rank, status: data.status, version: data.version }
          : ticket;
      patchTicketCollections(queryClient, variables.projectId, applyServerRank);
      queryClient.setQueryData<Ticket | null>(
        buildWorkQueryKeys.projects.ticket(variables.projectId, data.id),
        (current) => (current ? applyServerRank(current) : current),
      );
      options?.onSuccess?.(data, variables, context, mutationContext);
    },
    onSettled: (data, error, variables, context, mutationContext) => {
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
