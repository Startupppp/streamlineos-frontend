"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SupportTicketStatus, SupportTicketPriority, SupportMessageAttachment } from "@/types/support";

export type PortalTicketCategory =
  | "general"
  | "billing"
  | "bug_report"
  | "feature_request"
  | "onboarding"
  | "internal_it";

export interface PortalTicket {
  id: number;
  title: string;
  category: string | null;
  description: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface PortalMessage {
  id: number;
  body: string;
  isInternal: false;
  attachments: SupportMessageAttachment[];
  sourceChannel: string;
  createdAt: string;
  authorId: string;
}

export interface PortalTicketDetail extends PortalTicket {
  messages: PortalMessage[];
}

export interface CreatePortalTicketInput {
  title: string;
  category?: PortalTicketCategory;
  description: string;
  attachments?: SupportMessageAttachment[];
}

export interface ReplyPortalTicketInput {
  body: string;
  attachments?: SupportMessageAttachment[];
}

export function usePortalTickets() {
  return useQuery({
    queryKey: queryKeys.supportPortalTickets.list(),
    queryFn: () => apiClient.get<PortalTicket[]>("/support/portal/tickets"),
    staleTime: 30_000,
  });
}

export function useCreatePortalTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["supportPortalTickets", "create"],
    mutationFn: (input: CreatePortalTicketInput) =>
      apiClient.post<PortalTicket>("/support/portal/tickets", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportPortalTickets.all });
    },
  });
}

export function usePortalTicket(ticketId: number) {
  return useQuery({
    queryKey: queryKeys.supportPortalTickets.detail(ticketId),
    queryFn: () => apiClient.get<PortalTicketDetail>(`/support/portal/tickets/${ticketId}`),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 15_000,
  });
}

export function useReplyToPortalTicket(ticketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["supportPortalTickets", "reply", ticketId],
    mutationFn: (input: ReplyPortalTicketInput) =>
      apiClient.post<PortalMessage>(`/support/portal/tickets/${ticketId}/messages`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportPortalTickets.detail(ticketId) });
    },
  });
}
