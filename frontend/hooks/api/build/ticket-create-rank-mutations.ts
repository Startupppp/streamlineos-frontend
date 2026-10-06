"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  Ticket,
  CreateTicketInput,
  ProjectWithDetails,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import {
  addTicketToCollections,
  patchTicketCollections,
  removeTicketFromCollections,
  restoreRawCollections,
  snapshotTicketCollections,
  type RawCollectionSnapshot,
  type TicketSnapshots,
} from "./ticket-cache";
import { invalidateBuildViews } from "./ticket-cache-invalidation";

const ticketRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-core-schema").then(
    (m) => m.ticketRowContract,
  ),
);

const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface CreateTicketContext {
  tempId: number;
  listSnapshots: TicketSnapshots;
  subtasksKey: readonly unknown[] | null;
  previousSubtasks: Ticket[] | null;
  detailKey: readonly unknown[];
  previousDetail: ProjectWithDetails | null | undefined;
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
      const detailKey = buildWorkQueryKeys.projects.detail(variables.projectId);
      const subtasksKey =
        variables.parentTicketId !== undefined
          ? buildWorkQueryKeys.projects.subtasks(
              variables.parentTicketId,
              variables.projectId,
            )
          : null;
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: buildWorkQueryKeys.projects.tickets({
            projectId: variables.projectId,
          }),
        }),
        queryClient.cancelQueries({ queryKey: detailKey }),
        ...(subtasksKey !== null
          ? [queryClient.cancelQueries({ queryKey: subtasksKey })]
          : []),
      ]);
      const previousDetail =
        queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
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
      if (previousDetail?.tickets !== undefined) {
        queryClient.setQueryData<ProjectWithDetails | null>(detailKey, (old) =>
          old?.tickets
            ? { ...old, tickets: [tempTicket, ...old.tickets] }
            : old,
        );
      }
      return {
        tempId,
        listSnapshots,
        subtasksKey,
        previousSubtasks,
        detailKey,
        previousDetail,
      };
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
        queryClient.setQueryData<ProjectWithDetails | null>(
          context.detailKey,
          (old) => {
            if (!old?.tickets) return old;
            return {
              ...old,
              tickets: old.tickets.map((t) => (t.id === context.tempId ? data : t)),
            };
          },
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
        if (context.previousDetail !== undefined) {
          queryClient.setQueryData<ProjectWithDetails | null>(
            context.detailKey,
            context.previousDetail,
          );
        }
      }
      options?.onError?.(error, variables, context, mutFnCtx);
    },
    onSettled: (data, error, variables, context, mutFnCtx) => {
      invalidateBuildViews(queryClient, variables.projectId);
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}

interface DeleteTicketContext {
  collectionSnapshots: RawCollectionSnapshot[];
  previousDetail: ProjectWithDetails | null | undefined;
  previousTicket: Ticket | null | undefined;
}

export function useDeleteTicket(
  projectId: number,
  options?: Omit<
    UseMutationOptions<void, Error, { ticketId: number }, DeleteTicketContext>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, { ticketId: number }, DeleteTicketContext>(
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
      onMutate: async (variables) => {
        const detailKey = buildWorkQueryKeys.projects.detail(projectId);
        const ticketKey = buildWorkQueryKeys.projects.ticket(
          projectId,
          variables.ticketId,
        );
        await Promise.all([
          queryClient.cancelQueries({
            queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
          }),
          queryClient.cancelQueries({ queryKey: detailKey }),
          queryClient.cancelQueries({ queryKey: ticketKey }),
        ]);
        const collectionSnapshots = snapshotTicketCollections(
          queryClient,
          projectId,
        );
        const previousDetail =
          queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
        const previousTicket =
          queryClient.getQueryData<Ticket | null>(ticketKey);
        removeTicketFromCollections(queryClient, projectId, variables.ticketId);
        queryClient.setQueryData<ProjectWithDetails | null>(
          detailKey,
          (old) =>
            old?.tickets
              ? {
                  ...old,
                  tickets: old.tickets.filter((t) => t.id !== variables.ticketId),
                }
              : old,
        );
        queryClient.removeQueries({ queryKey: ticketKey, exact: true });
        return { collectionSnapshots, previousDetail, previousTicket };
      },
      onSuccess: (data, variables, context, mutFnCtx) => {
        invalidateBuildViews(queryClient, projectId, [variables.ticketId]);
        options?.onSuccess?.(data, variables, context, mutFnCtx);
      },
      onError: (error, variables, context, mutFnCtx) => {
        if (context) {
          restoreRawCollections(queryClient, context.collectionSnapshots);
          const detailKey = buildWorkQueryKeys.projects.detail(projectId);
          if (context.previousDetail !== undefined) {
            queryClient.setQueryData<ProjectWithDetails | null>(
              detailKey,
              context.previousDetail,
            );
          }
          const ticketKey = buildWorkQueryKeys.projects.ticket(
            projectId,
            variables.ticketId,
          );
          if (context.previousTicket !== undefined) {
            queryClient.setQueryData<Ticket | null>(ticketKey, context.previousTicket);
          }
        }
        options?.onError?.(error, variables, context, mutFnCtx);
      },
    },
  );
}

