"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Ticket,
  TicketLabel,
  CustomState,
  PaginatedResponse,
  TicketFilters,
  CreateTicketInput,
  UpdateTicketInput,
  MoveTicketInput,
  CreateLabelInput,
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
      apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/tickets`, filters as Record<string, unknown>),
    enabled: !!projectId,
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
    ...options,
  });
}

export function useCreateTicket(
  options?: Omit<UseMutationOptions<Ticket, Error, CreateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<Ticket, Error, CreateTicketInput>({
    mutationFn: ({ projectId, ...data }) =>
      apiClient.post<Ticket>(`/projects/${projectId}/tickets`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId: variables.projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useUpdateTicket(
  projectId: number,
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, UpdateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateTicketInput>({
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.patch<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`,
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
    },
    ...options,
  });
}

export function useDeleteTicket(
  projectId: number,
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number }>({
    mutationFn: ({ ticketId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.tickets({ projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
    },
    ...options,
  });
}

export function useMoveTicket(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, items }: MoveTicketInput) =>
      apiClient.patch<{ success: boolean }>(`/projects/${projectId}/tickets/reorder`, { items }),
    onSuccess: (_data: unknown, variables: MoveTicketInput) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      });
    },
    ...options,
  });
}

export function useCustomStates(
  projectId: number,
  options?: Omit<UseQueryOptions<CustomState[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<CustomState[]>({
    queryKey: [...queryKeys.projects.all, "customStates", projectId] as const,
    queryFn: () =>
      apiClient.get<CustomState[]>(`/projects/${projectId}/custom-states`),
    enabled: !!projectId,
    ...options,
  });
}

export function useLabels(options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">) {
  return useProjectLabels(undefined, options);
}

export function useAddComment(
  options?: Omit<UseMutationOptions<{ id: number; content: string; createdAt: string }, Error, { ticketId: number; projectId?: number; content: string }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: number; content: string; createdAt: string }, Error, { ticketId: number; projectId?: number; content: string }>({
    mutationFn: ({ ticketId, projectId = 0, content }) =>
      apiClient.post<{ id: number; content: string; createdAt: string }>(
        `/projects/${projectId}/tickets/${ticketId}/comments`,
        { content }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useUpdateTicketComment(
  options?: Omit<
    UseMutationOptions<
      { id: number; content: string; updatedAt: string | Date | null },
      Error,
      { ticketId: number; projectId?: number; commentId: number; content: string }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    { id: number; content: string; updatedAt: string | Date | null },
    Error,
    { ticketId: number; projectId?: number; commentId: number; content: string }
  >({
    mutationFn: ({ ticketId, projectId = 0, commentId, content }) =>
      apiClient.patch<{ id: number; content: string; updatedAt: string | Date | null }>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`,
        { content }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useDeleteTicketComment(
  options?: Omit<
    UseMutationOptions<
      { success: boolean },
      Error,
      { ticketId: number; projectId?: number; commentId: number }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { ticketId: number; projectId?: number; commentId: number }
  >({
    mutationFn: ({ ticketId, projectId = 0, commentId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/comments/${commentId}`
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useAddLabelToTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.post<{ success: boolean }>(`/projects/${projectId}/tickets/${ticketId}/labels`, { labelId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}

export function useRemoveLabelFromTicket(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number; projectId?: number; labelId: number }>({
    mutationFn: ({ ticketId, projectId = 0, labelId }) =>
      apiClient.delete<{ success: boolean }>(
        `/projects/${projectId}/tickets/${ticketId}/labels/${labelId}`
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
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
    ...options,
  });
}

export function useUpdateTicketOrder(options?: Parameters<typeof useMutation>[0]) {
  return useMoveTicket(options);
}

export function useCreateOrgLabel(
  options?: Omit<UseMutationOptions<TicketLabel, Error, CreateLabelInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<TicketLabel, Error, CreateLabelInput>({
    mutationFn: (data) =>
      apiClient.post<TicketLabel>("/projects/labels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.labels() });
    },
    ...options,
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
}

export function useBulkUpdateTickets(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkUpdateTicketsInput) =>
      apiClient.post<{ updated: number; ticketIds: number[] }>(
        `/projects/${projectId}/tickets/bulk`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets() });
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
    enabled: !!ticketId && !!projectId,
  });
}

export function useAddTicketRelation(ticketId: number, projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
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
    mutationFn: ({ ticketId, projectId = 0, fileName, fileUrl, fileKey, fileSize, mimeType }) =>
      apiClient.post<{ id: number }>(`/projects/${projectId}/tickets/${ticketId}/attachments`, {
        fileName,
        fileUrl,
        fileKey,
        fileSize,
        mimeType,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}
