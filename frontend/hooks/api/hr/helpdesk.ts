"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface CursorPage<T> {
  data: T[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const HELPDESK_CATEGORIES = [
  "policy_question",
  "payroll_issue",
  "document_request",
  "leave_issue",
  "benefits",
  "it_access",
  "confidential",
  "other",
] as const;

export type HelpdeskCategory = (typeof HELPDESK_CATEGORIES)[number];

export const HELPDESK_CATEGORY_LABELS: Record<HelpdeskCategory, string> = {
  policy_question: "Policy Question",
  payroll_issue: "Payroll Issue",
  document_request: "Document Request",
  leave_issue: "Leave Issue",
  benefits: "Benefits",
  it_access: "IT Access",
  confidential: "Confidential",
  other: "Other",
};

export type TicketStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface HelpdeskTicket {
  id: number;
  orgId: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: string | null;
  isConfidential: boolean;
  slaDueAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  authorImage: string | null;
}

export interface HelpdeskComment {
  id: number;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
}

export interface HelpdeskTicketDetail extends HelpdeskTicket {
  comments: HelpdeskComment[];
}

export type HelpdeskListResult = CursorPage<HelpdeskTicket>;

export interface HelpdeskRoutingRule {
  id: number;
  category: string;
  assigneeUserId: string;
  assigneeName: string | null;
  assigneeImage: string | null;
  createdAt: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  category: HelpdeskCategory;
  priority?: TicketPriority;
  isConfidential?: boolean;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  assigneeId?: string | null;
  priority?: TicketPriority;
  resolution?: string | null;
}

export interface SuggestResult {
  results: Array<{
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    source: string;
  }>;
}

export interface HelpdeskListParams {
  limit?: number;
  cursor?: string;
  status?: string;
  category?: string;
  assigneeId?: string;
  q?: string;
}

const keys = {
  all: [...queryKeyBase, "hr", "helpdesk"] as const,
  list: (params?: HelpdeskListParams) => [...queryKeyBase, "hr", "helpdesk", "list", params] as const,
  detail: (id: number) => [...queryKeyBase, "hr", "helpdesk", "detail", id] as const,
  routing: () => [...queryKeyBase, "hr", "helpdesk", "routing"] as const,
  suggest: (q: string) => [...queryKeyBase, "hr", "helpdesk", "suggest", q] as const,
};

export function useHelpdeskTickets(params?: HelpdeskListParams) {
  const canHelpdesk = useCan("hr:helpdesk:view");
  return useQuery({
    queryKey: keys.list(params),
    queryFn: ({ signal }) => apiClient.get<HelpdeskListResult>("/hr/helpdesk", params as Record<string, unknown>, signal),
    staleTime: 60_000,
    enabled: canHelpdesk,
  });
}

export function useHelpdeskTicket(ticketId: number) {
  return useGatedQuery("hr:helpdesk:view", {
    queryKey: keys.detail(ticketId),
    queryFn: ({ signal }) => apiClient.get<HelpdeskTicketDetail>(`/hr/helpdesk/${ticketId}`, undefined, signal),
    staleTime: 30_000,
  });
}

export function useHelpdeskSuggest(query: string) {
  return useQuery({
    queryKey: keys.suggest(query),
    queryFn: ({ signal }) => apiClient.get<SuggestResult>("/hr/helpdesk/suggest", { query }, signal),
    enabled: query.length >= 2,
    staleTime: 5 * 60_000,
  });
}

export function useHelpdeskRoutingRules() {
  return useGatedQuery("hr:helpdesk:manage", {
    queryKey: keys.routing(),
    queryFn: ({ signal }) => apiClient.get<HelpdeskRoutingRule[]>("/hr/helpdesk/routing", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreateHelpdeskTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:create", {
    mutationKey: ["hr", "helpdesk", "create"],
    mutationFn: (data: CreateTicketInput) => apiClient.post<HelpdeskTicket>("/hr/helpdesk", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useUpdateHelpdeskTicket(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:manage", {
    mutationKey: ["hr", "helpdesk", "update", ticketId],
    mutationFn: (data: UpdateTicketInput) =>
      apiClient.patch<HelpdeskTicket>(`/hr/helpdesk/${ticketId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.detail(ticketId) });
      void qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useAddHelpdeskComment(ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:view", {
    mutationKey: ["hr", "helpdesk", "comment", ticketId],
    mutationFn: (data: { body: string }) =>
      apiClient.post<HelpdeskComment>(`/hr/helpdesk/${ticketId}/comments`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.detail(ticketId) });
    },
  });
}

export function useDeleteHelpdeskRouting() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:helpdesk:manage", {
    mutationKey: ["hr", "helpdesk", "routing", "delete"],
    mutationFn: (ruleId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/helpdesk/routing/${ruleId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.routing() });
    },
  });
}
