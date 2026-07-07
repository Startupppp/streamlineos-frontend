"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  SupportTicket,
  SupportMessage,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportMessageAttachment,
} from "@/types/support";

interface SupportTicketsResponse {
  items: SupportTicket[];
  total: number;
  page: number;
  totalPages: number;
}

interface SupportFilters {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assigneeId?: string;
  queueId?: number;
  channel?: string;
  page?: number;
  limit?: number;
}

interface CreateTicketInput {
  title: string;
  category?: string;
  description?: string;
  clientId?: number;
  priority?: SupportTicketPriority;
  assigneeId?: string;
}

interface UpdateTicketInput {
  id: number;
  status?: SupportTicketStatus;
  assigneeId?: string;
  queueId?: number | null;
  expectedUpdatedAt?: string;
}

interface UpdateTicketResult {
  success: boolean;
  updatedAt: string;
}

interface AddMessageInput {
  ticketId: number;
  body: string;
  isInternal?: boolean;
  attachments?: SupportMessageAttachment[];
}

export const useSupportTickets = (
  filters?: SupportFilters,
  options?: Omit<
    UseQueryOptions<SupportTicketsResponse, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<SupportTicketsResponse, Error>({
    queryKey: queryKeys.support.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<SupportTicketsResponse>("/support", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.priority ? { priority: filters.priority } : {}),
        ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters?.queueId ? { queueId: String(filters.queueId) } : {}),
        ...(filters?.channel ? { channel: filters.channel } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 2 * 60_000,
    ...options,
  });
};

export const useSupportTicket = (
  id: number,
  options?: Omit<
    UseQueryOptions<SupportTicket, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useQuery<SupportTicket, Error>({
    queryKey: queryKeys.support.detail(id),
    queryFn: () => apiClient.get<SupportTicket>(`/support/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
    ...options,
  });
};

export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation<SupportTicket, Error, CreateTicketInput>({
    mutationFn: (data) => apiClient.post<SupportTicket>("/support", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.all });
    },
  });
};

export const useUpdateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation<UpdateTicketResult, Error, UpdateTicketInput>({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<UpdateTicketResult>(`/support/${id}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.support.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.support.detail(vars.id) });
    },
  });
};

export const useAddSupportMessage = () => {
  const queryClient = useQueryClient();
  return useMutation<SupportMessage, Error, AddMessageInput>({
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.post<SupportMessage>(`/support/${ticketId}/messages`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.detail(variables.ticketId),
      });
    },
  });
};

interface SupportStats {
  open: number;
  in_progress: number;
  waiting: number;
  resolved: number;
  closed: number;
  sla_breached: number;
}

export const useSupportStats = (
  options?: Omit<UseQueryOptions<SupportStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<SupportStats, Error>({
    queryKey: [...queryKeys.support.all, "stats"] as const,
    queryFn: () => apiClient.get<SupportStats>("/support/stats"),
    staleTime: 5 * 60_000,
    ...options,
  });
};
