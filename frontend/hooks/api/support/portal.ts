"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import type { SupportTicketStatus, SupportTicketPriority, SupportMessageAttachment } from "@/types/support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const portalTicketListC = lazyContract(() =>
  import("./support-portal-schema").then((m) => m.portalTicketListContract),
);
const portalCreateTicketC = lazyContract(() =>
  import("./support-portal-schema").then((m) => m.portalCreateTicketContract),
);
const portalTicketDetailC = lazyContract(() =>
  import("./support-portal-schema").then((m) => m.portalTicketDetailContract),
);
const portalMessageC = lazyContract(() =>
  import("./support-portal-schema").then((m) => m.portalMessageContract),
);

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
  isInternal: boolean;
  attachments: SupportMessageAttachment[];
  sourceChannel: string;
  createdAt: string;
  authorId: string | null;
}

export interface PortalTicketDetail extends PortalTicket {
  description: string | null;
  messages: PortalMessage[];
}

export interface CreatePortalTicketInput {
  title: string;
  category?: PortalTicketCategory;
  description: string;
  attachments?: SupportMessageAttachment[];
  customFields?: { fieldId: number; value: string | null }[];
}

export interface ReplyPortalTicketInput {
  body: string;
  attachments?: SupportMessageAttachment[];
}

export function usePortalTickets() {
  return useGatedQuery("support:portal:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportPortalTickets.list(),
    queryFn: ({ signal }) => apiClient.get<PortalTicket[]>("/support/portal/tickets", undefined, signal, portalTicketListC),
    staleTime: 30_000,
  });
}

export function useCreatePortalTicket() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("support:portal:tickets:create", {
    mutationKey: ["supportPortalTickets", "create"],
    mutationFn: (input: CreatePortalTicketInput) =>
      apiClient.post<PortalTicket>("/support/portal/tickets", input, undefined, portalCreateTicketC),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportPortalTickets.all });
    },
  });
}

export function usePortalTicket(ticketId: number) {
  return useGatedQuery("support:portal:tickets:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportPortalTickets.detail(ticketId),
    queryFn: ({ signal }) => apiClient.get<PortalTicketDetail>(`/support/portal/tickets/${ticketId}`, undefined, signal, portalTicketDetailC),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 15_000,
  });
}

export function useReplyToPortalTicket(ticketId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("support:portal:tickets:reply", {
    mutationKey: ["supportPortalTickets", "reply", ticketId],
    mutationFn: (input: ReplyPortalTicketInput) =>
      apiClient.post<PortalMessage>(`/support/portal/tickets/${ticketId}/messages`, input, undefined, portalMessageC),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportPortalTickets.detail(ticketId) });
    },
  });
}
