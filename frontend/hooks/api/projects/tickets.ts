"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Ticket,
  TicketLabel,
  PaginatedResponse,
  TicketFilters,
  CreateTicketInput,
  UpdateTicketInput,
  MoveTicketInput,
  CreateLabelInput,
  ProjectWithDetails,
  ProjectMember,
} from "@/types/projects";
import { useProjectLabels } from "./projects";

export function useTickets(
  projectId: number,
  filters?: TicketFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<Ticket>>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<PaginatedResponse<Ticket>>({
    queryKey: queryKeys.projects.tickets({ projectId, ...filters }),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/tickets`, filters ? { ...filters } : undefined),
    enabled: !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    ...options,
  });
}

const BOARD_PAGE_SIZE = 100;
const BOARD_MAX_PAGES = 5;

export function useProjectBoardTickets(
  projectId: number,
  options?: Omit<UseQueryOptions<Ticket[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Ticket[]>({
    queryKey: queryKeys.projects.tickets({ projectId, view: "board" }),
    queryFn: async () => {
      const first = await apiClient.get<PaginatedResponse<Ticket>>(
        `/projects/${projectId}/tickets`,
        { limit: BOARD_PAGE_SIZE, page: 1, orderBy: "order", orderDir: "asc" },
      );
      const pages = Math.min(first.totalPages ?? 1, BOARD_MAX_PAGES);
      if (pages <= 1) return first.data ?? [];
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/tickets`, {
            limit: BOARD_PAGE_SIZE,
            page: i + 2,
            orderBy: "order",
            orderDir: "asc",
          }),
        ),
      );
      return [...(first.data ?? []), ...rest.flatMap((p) => p.data ?? [])];
    },
    enabled: !!projectId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useTicket(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<Ticket | null>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Ticket | null>({
    queryKey: queryKeys.projects.ticket(ticketId),
    queryFn: () =>
      apiClient.get<Ticket | null>(`/projects/${projectId}/tickets/${ticketId}`),
    enabled: !!ticketId && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateTicket(
  options?: Omit<UseMutationOptions<Ticket, Error, CreateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<Ticket, Error, CreateTicketInput>({
    ...options,
    mutationKey: ["projects", "tickets", "create"],
    mutationFn: ({ projectId, ...data }) =>
      apiClient.post<Ticket>(`/projects/${projectId}/tickets`, data),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard.all, "myIssues"] });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}


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
  listSnapshots: [readonly unknown[], PaginatedResponse<Ticket> | undefined][];
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

export function useUpdateTicket(
  projectId: number,
  options?: Omit<
    UseMutationOptions<UpdateTicketResponse, Error, UpdateTicketInput, UpdateTicketContext>,
    "mutationFn" | "mutationKey" | "onMutate"
  >
) {
  const queryClient = useQueryClient();
  return useMutation<UpdateTicketResponse, Error, UpdateTicketInput, UpdateTicketContext>({
    ...options,
    mutationKey: ["projects", "tickets", "update"],
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.patch<UpdateTicketResponse>(
        `/projects/${projectId}/tickets/${ticketId}`,
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
      const listSnapshots = queryClient.getQueriesData<PaginatedResponse<Ticket>>({
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
        queryClient.setQueryData<PaginatedResponse<Ticket>>(key, {
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
      if (affectsSprintAggregates) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.sprints(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });
      }
      if (affectsSprintAggregates || affectsAssignment) {
        queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard.all, "myIssues"] });
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
  return useMutation<{ success: boolean }, Error, { ticketId: number }>({
    ...options,
    mutationKey: ["projects", "tickets", "delete"],
    mutationFn: ({ ticketId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projectReports.all });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard.all, "myIssues"] });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useMoveTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, MoveTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, MoveTicketInput>({
    ...options,
    mutationKey: ["projects", "tickets", "move"],
    mutationFn: ({ projectId, items }: MoveTicketInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}/tickets/reorder`, { items }),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
      });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useLabels(options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">) {
  return useProjectLabels(undefined, options);
}

export interface AddCommentInput {
  ticketId: number;
  projectId?: number;
  content: string;
  parentCommentId?: number;
}

export function useAddComment(
  options?: Omit<UseMutationOptions<{ id: number; content: string; createdAt: string }, Error, AddCommentInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; content: string; createdAt: string }, Error, AddCommentInput>({
    ...options,
    mutationKey: ["projects", "tickets", "comments", "add"],
    mutationFn: ({ ticketId, projectId = 0, content, parentCommentId }) =>
      apiClient.post<{ id: number; content: string; createdAt: string }>(
        `/projects/${projectId}/tickets/${ticketId}/comments`,
        { content, parentCommentId }
      ),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.ticketActivity.list(variables.ticketId),
      });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useAddLabelToTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    ...options,
    mutationKey: ["projects", "tickets", "labels", "add"],
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.post<{ success: boolean }>(`/projects/${projectId}/tickets/${ticketId}/labels`, { labelId }),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
        });
      }
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useRemoveLabelFromTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    ...options,
    mutationKey: ["projects", "tickets", "labels", "remove"],
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/labels/${labelId}`
      ),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
        });
      }
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useSubtasks(
  ticketId: number,
  projectId?: number,
  options?: Omit<UseQueryOptions<Ticket[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<Ticket[]>({
    queryKey: [...queryKeys.projects.all, "subtasks", { ticketId }],
    queryFn: () => apiClient.get<Ticket[]>(`/projects/${projectId ?? 0}/tickets/${ticketId}/subtasks`),
    enabled: ticketId > 0 && (projectId ?? 0) > 0,
    staleTime: 30_000,
    ...options,
  });
}

export function useUpdateTicketOrder(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, MoveTicketInput>, "mutationFn">
) {
  return useMoveTicket(options);
}

export function useCreateOrgLabel(
  options?: Omit<UseMutationOptions<TicketLabel, Error, CreateLabelInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<TicketLabel, Error, CreateLabelInput>({
    ...options,
    mutationKey: ["projects", "labels", "create"],
    mutationFn: (data) =>
      apiClient.post<TicketLabel>("/projects/labels", data),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.projects.all, "labels"] });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

type AddAttachmentInput = {
  ticketId: number;
  projectId?: number;
  fileName: string;
  fileUrl: string;
  fileKey?: string;
  fileSize: number;
  mimeType: string;
};


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
  return useMutation({
    mutationKey: ["projects", "tickets", "bulk-update"],
    mutationFn: (data: BulkUpdateTicketsInput) =>
      apiClient.post<{ updated: number; ticketIds: number[] }>(
        `/projects/${projectId}/tickets/bulk`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId }) });
    },
  });
}


export type WorkItemRelationType = "blocks" | "blocked_by" | "duplicate_of" | "relates_to";

export interface TicketRelation {
  id: number;
  relationType: WorkItemRelationType;
  relatedTicket: {
    id: number;
    title: string;
    ticketNumber: number | null;
    status: string | null;
    priority: string | null;
  } | null;
  direction: "outgoing" | "incoming";
}

export function useTicketRelations(ticketId: number, projectId: number) {
  return useQuery({
    queryKey: [...queryKeys.projects.ticket(ticketId), "relations"],
    queryFn: () =>
      apiClient.get<TicketRelation[]>(`/projects/${projectId}/tickets/${ticketId}/relations`),
    staleTime: 2 * 60_000,
    enabled: !!ticketId && !!projectId,
  });
}

export function useAddTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "tickets", "relations", "add"],
    mutationFn: (data: { relatedTicketId: number; relationType: WorkItemRelationType }) =>
      apiClient.post<{ id: number }>(`/projects/${projectId}/tickets/${ticketId}/relations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.ticket(ticketId), "relations"],
      });
    },
  });
}

export function useRemoveTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "tickets", "relations", "remove"],
    mutationFn: (relatedId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/relations?relatedId=${relatedId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.ticket(ticketId), "relations"],
      });
    },
  });
}

export function useAddAttachment(
  options?: Omit<UseMutationOptions<{ id: number }, Error, AddAttachmentInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number }, Error, AddAttachmentInput>({
    ...options,
    mutationKey: ["projects", "tickets", "attachments", "add"],
    mutationFn: ({ ticketId, projectId = 0, fileName, fileUrl, fileKey, fileSize, mimeType }) =>
      apiClient.post<{ id: number }>(`/projects/${projectId}/tickets/${ticketId}/attachments`, {
        fileName,
        fileUrl,
        fileKey,
        fileSize,
        mimeType,
      }),
    onSuccess: (data, variables, context, mutFnCtx) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}
