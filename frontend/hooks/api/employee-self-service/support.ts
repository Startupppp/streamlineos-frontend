"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { employeeSupportQueryKeys } from "@/lib/query-keys/employee-support";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { HelpdeskCategory } from "@/lib/employee-support";
import type {
  HelpdeskComment,
  HelpdeskListResult,
  HelpdeskTicketDetail,
  SuggestResult,
  TicketPriority,
  TicketStatus,
} from "@/hooks/api/hr/helpdesk-schema";

const keys = employeeSupportQueryKeys.employeeSupport;

const listC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskTicketListContract));
const detailC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskTicketDetailContract));
const commentC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskCommentSingleContract));
const suggestC = lazyContract(() => import("@/hooks/api/hr/helpdesk-schema").then((m) => m.helpdeskSuggestContract));

export interface CreateSupportRequestInput {
  title: string;
  description?: string;
  category: HelpdeskCategory;
  priority?: TicketPriority;
  isConfidential?: boolean;
}

export interface MyRequestsParams {
  limit?: number;
  cursor?: string;
  status?: TicketStatus;
}

export function useMySupportSuggest(query: string) {
  return useGatedQuery("self:support", {
    queryKey: keys.suggest(query),
    queryFn: ({ signal }) => apiClient.get<SuggestResult>("/me/support/suggest", { query }, signal, suggestC),
    enabled: query.length >= 2,
    staleTime: 5 * 60_000,
  });
}

export function useMySupportRequests(params: MyRequestsParams) {
  const canRaise = useCan("self:support");
  return useQuery({
    queryKey: keys.myRequests(params),
    queryFn: ({ signal }) => apiClient.get<HelpdeskListResult>("/me/support", params, signal, listC),
    staleTime: 15_000,
    enabled: canRaise,
  });
}

export function useMySupportRequest(ticketId: number | null) {
  return useGatedQuery("self:support", {
    queryKey: keys.myRequest(ticketId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<HelpdeskTicketDetail>(`/me/support/${ticketId}`, undefined, signal, detailC),
    enabled: ticketId !== null,
    staleTime: 30_000,
  });
}

export function useCreateMySupportRequest() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<HelpdeskTicketDetail, Error, CreateSupportRequestInput>("self:support", {
    mutationKey: ["employee-support", "my-request", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<HelpdeskTicketDetail>("/me/support", data, { headers: { "Idempotency-Key": idempotencyKey } }, detailC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.myRequests() });
      void qc.invalidateQueries({ queryKey: keys.queueList() });
      void qc.invalidateQueries({ queryKey: keys.queues() });
    },
  });
}

export function useAddMySupportComment(ticketId: number | null) {
  const qc = useQueryClient();
  return useAuthorizedMutation("self:support", {
    mutationKey: ["employee-support", "my-request", "comment", ticketId],
    mutationFn: (data: { body: string }) =>
      apiClient.post<HelpdeskComment>(`/me/support/${ticketId}/comments`, data, undefined, commentC),
    onSuccess: () => {
      if (ticketId !== null) void qc.invalidateQueries({ queryKey: keys.myRequest(ticketId) });
    },
  });
}

