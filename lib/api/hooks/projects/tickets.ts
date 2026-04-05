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

// ─── Tickets ──────────────────────────────────────────────────────────────────

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

// ─── Custom States ────────────────────────────────────────────────────────────

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

// ─── Backward-compatibility aliases ──────────────────────────────────────────

/** Alias for useProjectLabels() — fetches all labels across the org. */
export function useLabels(options?: Omit<UseQueryOptions<TicketLabel[]>, "queryKey" | "queryFn">) {
  return useProjectLabels(undefined, options);
}

/**
 * Backward-compat useUpdateTicket that doesn't require projectId as first arg.
 * The ticket ID is in the input data; the URL uses the ticket-level PATCH endpoint.
 */
export function useUpdateTicketCompat(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, UpdateTicketInput>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, UpdateTicketInput>({
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.patch<{ success: boolean }>(`/projects/tickets/${ticketId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.ticket(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

/** Backward-compat useDeleteTicket that doesn't require projectId as first arg. */
export function useDeleteTicketCompat(
  options?: Omit<UseMutationOptions<{ success: boolean }, Error, { ticketId: number }>, "mutationFn">
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { ticketId: number }>({
    mutationFn: ({ ticketId }) =>
      apiClient.delete<{ success: boolean }>(`/projects/tickets/${ticketId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    ...options,
  });
}

/** Add a comment to a ticket. */
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

/** Add a label to a ticket. */
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

/** Remove a label from a ticket. */
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

/** Fetch subtasks of a ticket. */
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

/** Reorder tickets within a project (drag-and-drop). Alias for useMoveTicket. */
export function useUpdateTicketOrder(options?: Parameters<typeof useMutation>[0]) {
  return useMoveTicket(options);
}

/**
 * Backward-compat useCreateLabel that creates an org-level label (no projectId).
 * The label can then be attached to any ticket in the org.
 */
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

/** Add a file attachment to a ticket. */
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
