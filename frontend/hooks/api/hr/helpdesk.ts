"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { employeeSupportQueryKeys } from "@/lib/query-keys/employee-support";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { HelpdeskCategory, SupportQueue } from "@/lib/employee-support";
import type {
  HelpdeskComment,
  HelpdeskListResult,
  HelpdeskQueueSummary,
  HelpdeskRoutingRule,
  HelpdeskTicketDetail,
  TicketPriority,
  TicketStatus,
} from "@/hooks/api/hr/helpdesk-schema";

const keys = employeeSupportQueryKeys.employeeSupport;

const listC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskTicketListContract));
const detailC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskTicketDetailContract));
const commentC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskCommentSingleContract));
const routingC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskRoutingListContract));
const routingRuleC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskRoutingRuleContract));
const queuesC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskQueueListContract));
const queueC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskQueueSummaryContract));
const successC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.successResponseContract));

export interface UpdateTicketInput {
  status?: TicketStatus;
  assigneeId?: string | null;
  priority?: TicketPriority;
  queue?: SupportQueue;
  resolution?: string | null;
}

export interface RoutingRuleInput {
  category: HelpdeskCategory;
  queue?: SupportQueue;
  assigneeUserId?: string;
}

export interface QueueConfigInput {
  firstResponseHours: number;
  resolutionHours: number;
  escalationUserId: string | null;
}

export interface HelpdeskListParams {
  limit?: number;
  cursor?: string;
  status?: TicketStatus;
  category?: HelpdeskCategory;
  queue?: SupportQueue;
  assigneeId?: string;
  q?: string;
}

export function useSupportQueueTickets(params: HelpdeskListParams) {
  const canView = useCan("hr:helpdesk:view");
  return useQuery({
    queryKey: keys.queueList(params),
    queryFn: ({ signal }) => apiClient.get<HelpdeskListResult>("/hr/helpdesk", params, signal, listC),
    staleTime: 15_000,
    enabled: canView,
  });
}

export function useSupportQueueTicket(ticketId: number | null) {
  return useGatedQuery("hr:helpdesk:view", {
    queryKey: keys.queueTicket(ticketId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<HelpdeskTicketDetail>(`/hr/helpdesk/${ticketId}`, undefined, signal, detailC),
    enabled: ticketId !== null,
    staleTime: 30_000,
  });
}

export function useSupportQueues() {
  return useGatedQuery("hr:helpdesk:view", {
    queryKey: keys.queues(),
    queryFn: ({ signal }) => apiClient.get<HelpdeskQueueSummary[]>("/hr/helpdesk/queues", undefined, signal, queuesC),
    staleTime: 30_000,
  });
}

export function useSupportRoutingRules() {
  return useGatedQuery("hr:helpdesk:manage", {
    queryKey: keys.routing(),
    queryFn: ({ signal }) => apiClient.get<HelpdeskRoutingRule[]>("/hr/helpdesk/routing", undefined, signal, routingC),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateSupportQueueTicket(ticketId: number | null) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:view", {
    mutationKey: ["employee-support", "queue-ticket", "update", ticketId],
    mutationFn: (data: UpdateTicketInput) =>
      apiClient.patch<HelpdeskTicketDetail>(`/hr/helpdesk/${ticketId}`, data, undefined, detailC),
    onSuccess: (detail) => {
      if (ticketId !== null) qc.setQueryData(keys.queueTicket(ticketId), detail);
      void qc.invalidateQueries({ queryKey: keys.queueList() });
      void qc.invalidateQueries({ queryKey: keys.queues() });
    },
  });
}

export function useAddSupportQueueComment(ticketId: number | null) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:view", {
    mutationKey: ["employee-support", "queue-ticket", "comment", ticketId],
    mutationFn: (data: { body: string }) =>
      apiClient.post<HelpdeskComment>(`/hr/helpdesk/${ticketId}/comments`, data, undefined, commentC),
    onSuccess: () => {
      if (ticketId !== null) void qc.invalidateQueries({ queryKey: keys.queueTicket(ticketId) });
      void qc.invalidateQueries({ queryKey: keys.queues() });
    },
  });
}

export function useUpsertSupportRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:manage", {
    mutationKey: ["employee-support", "routing", "upsert"],
    mutationFn: (data: RoutingRuleInput) =>
      apiClient.post<HelpdeskRoutingRule>("/hr/helpdesk/routing", data, undefined, routingRuleC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.routing() });
    },
  });
}

export function useDeleteSupportRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:manage", {
    mutationKey: ["employee-support", "routing", "delete"],
    mutationFn: (ruleId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/helpdesk/routing/${ruleId}`, undefined, undefined, successC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.routing() });
    },
  });
}

export function useConfigureSupportQueue() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:manage", {
    mutationKey: ["employee-support", "queues", "configure"],
    mutationFn: ({ queue, ...data }: QueueConfigInput & { queue: SupportQueue }) =>
      apiClient.put<HelpdeskQueueSummary>(`/hr/helpdesk/queues/${queue}`, data, undefined, queueC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.queues() });
    },
  });
}
