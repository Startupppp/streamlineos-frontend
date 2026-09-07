"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  SupportTicket,
  SupportMessage,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportMessageAttachment,
} from "@/types/support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const supportTicketListContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.supportTicketListContract),
);
const supportTicketDetailContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.supportTicketDetailContract),
);
const createTicketContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.createTicketContract),
);
const updateTicketContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.updateTicketContract),
);
const supportTicketMessageContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.supportTicketMessageContract),
);
const supportTicketStatsContract = lazyContract(() =>
  import("@/hooks/api/support/support-ticket-schema").then((m) => m.supportTicketStatsContract),
);

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
  snoozed?: boolean;
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
    UseQueryOptions<unknown, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useGatedQuery("support:tickets:view", {
    queryKey: platformCoreQueryKeys.support.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get("/support", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.priority ? { priority: filters.priority } : {}),
        ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters?.queueId ? { queueId: String(filters.queueId) } : {}),
        ...(filters?.channel ? { channel: filters.channel } : {}),
        ...(filters?.snoozed !== undefined ? { snoozed: String(filters.snoozed) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }, signal, supportTicketListContract),
    staleTime: 2 * 60_000,
    ...options,
  });
};

export const useSupportTicket = (
  id: number,
  options?: Omit<
    UseQueryOptions<unknown, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) => {
  return useGatedQuery("support:tickets:view", {
    queryKey: platformCoreQueryKeys.support.detail(id),
    queryFn: ({ signal }) => apiClient.get(`/support/${id}`, undefined, signal, supportTicketDetailContract),
    enabled: id > 0,
    staleTime: 2 * 60_000,
    ...options,
  });
};

export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<unknown, Error, CreateTicketInput>("support:tickets:create", {
    mutationKey: ["create", "support", "ticket"],
    mutationFn: (data) => apiClient.post("/support", data, undefined, createTicketContract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
    },
  });
};

export const useUpdateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<UpdateTicketResult, Error, UpdateTicketInput>("support:tickets:manage", {
    mutationKey: ["update", "support", "ticket"],
    mutationFn: ({ id, ...data }) =>
      apiClient.patch<UpdateTicketResult>(`/support/${id}`, data, undefined, updateTicketContract),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.support.all });
      queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(vars.id) });
    },
  });
};

export const useAddSupportMessage = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<unknown, Error, AddMessageInput>("support:tickets:reply", {
    mutationKey: ["add", "support", "message"],
    mutationFn: ({ ticketId, ...data }) =>
      apiClient.post(`/support/${ticketId}/messages`, data, undefined, supportTicketMessageContract),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.support.detail(variables.ticketId),
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
  return useGatedQuery("support:tickets:view", {
    queryKey: [...platformCoreQueryKeys.support.all, "stats"] as const,
    queryFn: ({ signal }) => apiClient.get<SupportStats>("/support/stats", undefined, signal, supportTicketStatsContract),
    staleTime: 5 * 60_000,
    ...options,
  });
};
