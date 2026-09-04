"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Ticket,
  CursorPageResponse,
  CreateTicketInput,
  UpdateTicketInput,
  RankTicketInput,
  ProjectWithDetails,
  ProjectMember,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface UpdateTicketResponse {
  updated: boolean;
  updatedAt: string;
}

interface UpdateTicketContext {
  detailKey: readonly unknown[];
  ticketKey: readonly unknown[];
  boardKey: readonly unknown[];
  previousDetail: ProjectWithDetails | null | undefined;
  previousTicket: Ticket | null | undefined;
  previousBoard: Ticket[] | undefined;
  listSnapshots: [readonly unknown[], CursorPageResponse<Ticket> | undefined][];
}

function resolveAssigneeId(input: UpdateTicketInput): string | null | undefined {
  if (input.assigneeIds !== undefined) return input.assigneeIds[0] ?? null;
  if (input.assigneeId !== undefined) return input.assigneeId;
  return undefined;
}

function applyTicketPatch(
  ticket: Ticket,
  input: UpdateTicketInput,
  members: ProjectMember[],
): Ticket {
  const next: Ticket = { ...ticket };
  if (input.title !== undefined) next.title = input.title;
  if (input.description !== undefined) next.description = input.description;
  if (input.type !== undefined) next.type = input.type;
  if (input.status !== undefined) next.status = input.status;
  if (input.priority !== undefined) next.priority = input.priority;
  if (input.points !== undefined) next.points = input.points;
  if (input.sprintId !== undefined) next.sprintId = input.sprintId;
  if (input.epicId !== undefined) next.epicId = input.epicId;
  if (input.moduleId !== undefined) next.moduleId = input.moduleId;
  if (input.cycleId !== undefined) next.cycleId = input.cycleId;
  if (input.startDate !== undefined) next.startDate = input.startDate;
  if (input.dueDate !== undefined) next.dueDate = input.dueDate;
  if (input.parentTicketId !== undefined) next.parentTicketId = input.parentTicketId;
  const assigneeId = resolveAssigneeId(input);
  if (assigneeId !== undefined) {
    next.assigneeId = assigneeId;
    const member = assigneeId
      ? members.find((m) => m.user?.id === assigneeId)
      : undefined;
    next.assignee = member?.user
      ? {
          id: member.user.id,
          name: member.user.name,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          email: member.user.email,
          image: member.user.image,
        }
      : null;
  }
  return next;
}

export function useCreateTicket(
  options?: Omit<UseMutationOptions<Ticket, Error, CreateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Ticket, Error, CreateTicketInput>("build:tickets:create", {
    ...options,
    mutationKey: ["projects", "tickets", "create"],
    mutationFn: ({ projectId, ...data }) =>
      apiClient.post<Ticket>(`/build/${projectId}/tickets`, data),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.columnCounts(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myIssues() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useUpdateTicket(
  projectId: number,
  options?: Omit<
    UseMutationOptions<UpdateTicketResponse, Error, UpdateTicketInput, UpdateTicketContext>,
    "mutationFn" | "mutationKey" | "onMutate"
  >
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<UpdateTicketResponse, Error, UpdateTicketInput, UpdateTicketContext>("build:tickets:update", {
    ...options,
    mutationKey: ["projects", "tickets", "update"],
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.patch<UpdateTicketResponse>(
        `/build/${projectId}/tickets/${ticketId}`,
        data
      ),
    onMutate: async (variables) => {
      const detailKey = queryKeys.projects.detail(projectId);
      const ticketKey = queryKeys.projects.ticket(variables.ticketId);
      const boardKey = queryKeys.projects.tickets({ projectId, view: "board" });
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: boardKey }),
        queryClient.cancelQueries({ queryKey: queryKeys.projects.tickets({ projectId }) }),
      ]);
      const previousDetail = queryClient.getQueryData<ProjectWithDetails | null>(detailKey);
      const previousTicket = queryClient.getQueryData<Ticket | null>(ticketKey);
      const previousBoard = queryClient.getQueryData<Ticket[]>(boardKey);
      const members = previousDetail?.members ?? [];
      const listSnapshots = queryClient.getQueriesData<CursorPageResponse<Ticket>>({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });

      if (previousDetail?.tickets) {
        queryClient.setQueryData<ProjectWithDetails | null>(detailKey, (old) => {
          if (!old?.tickets) return old;
          return {
            ...old,
            tickets: old.tickets.map((t) =>
              t.id === variables.ticketId ? applyTicketPatch(t, variables, members) : t,
            ),
          };
        });
      }
      if (previousTicket) {
        queryClient.setQueryData<Ticket | null>(ticketKey, (old) =>
          old ? applyTicketPatch(old, variables, members) : old,
        );
      }
      if (previousBoard) {
        queryClient.setQueryData<Ticket[]>(boardKey, (old) =>
          old
            ? old.map((t) =>
                t.id === variables.ticketId ? applyTicketPatch(t, variables, members) : t,
              )
            : old,
        );
      }
      for (const [key, page] of listSnapshots) {
        if (!page?.data) continue;
        queryClient.setQueryData<CursorPageResponse<Ticket>>(key, {
          ...page,
          data: page.data.map((t) =>
            t.id === variables.ticketId ? applyTicketPatch(t, variables, members) : t,
          ),
        });
      }
      return {
        detailKey,
        ticketKey,
        boardKey,
        previousDetail,
        previousTicket,
        previousBoard,
        listSnapshots,
      };
    },
    onError: (error, variables, context, mutFnCtx) => {
      if (context) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
        queryClient.setQueryData(context.ticketKey, context.previousTicket);
        queryClient.setQueryData(context.boardKey, context.previousBoard);
        for (const [key, page] of context.listSnapshots) {
          queryClient.setQueryData(key, page);
        }
      }
      options?.onError?.(error, variables, context, mutFnCtx);
    },
    onSettled: (data, error, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.ticketActivity.list(variables.ticketId),
      });
      const affectsSprintAggregates =
        variables.status !== undefined ||
        variables.sprintId !== undefined ||
        variables.points !== undefined;
      const affectsAssignment =
        variables.assigneeId !== undefined || variables.assigneeIds !== undefined;
      if (variables.status !== undefined) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.columnCounts(projectId),
        });
      }
      if (affectsSprintAggregates) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.sprints(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });
      }
      if (affectsSprintAggregates || affectsAssignment) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myIssues() });
      }
      options?.onSettled?.(data, error, variables, context, mutFnCtx);
    },
  });
}

export function useDeleteTicket(
  projectId: number,
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, { ticketId: number }>("build:tickets:delete", {
    ...options,
    mutationKey: ["projects", "tickets", "delete"],
    mutationFn: ({ ticketId }) =>
      apiClient.delete<{ success: boolean }>(
        `/build/${projectId}/tickets/${ticketId}`
      ),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.sprints(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.columnCounts(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myIssues() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
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
  >
) {
  return useMutation<RankTicketResponse, Error, RankTicketInput, TContext>({
    ...options,
    mutationKey: ["projects", "tickets", "rank"],
    mutationFn: ({ projectId, ticketId, ...data }) =>
      apiClient.patch<RankTicketResponse>(
        `/build/${projectId}/tickets/${ticketId}/rank`,
        data,
      ),
  });
}

export interface BulkUpdateTicketsInput {
  ticketIds: number[];
  assigneeId?: string;
  status?: string;
  sprintId?: number | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  parentTicketId?: number | null;
}

export function useBulkUpdateTickets(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "tickets", "bulk-update"],
    mutationFn: (data: BulkUpdateTicketsInput) =>
      apiClient.post<{ updated: number; ticketIds: number[] }>(
        `/build/${projectId}/tickets/bulk`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.columnCounts(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.myIssues() });
    },
  });
}
