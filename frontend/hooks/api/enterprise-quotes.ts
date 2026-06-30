"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type EnterpriseQuoteStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface EnterpriseQuoteListItem {
  id: number;
  quoteRef: string;
  subject: string;
  planTier: string;
  negotiatedSeats: number;
  pricePerSeatInPaise: number;
  contractTermMonths: number;
  status: EnterpriseQuoteStatus;
  validUntil: string;
  createdAt: string;
  dealName: string | null;
  clientName: string | null;
}

export interface EnterpriseQuote {
  id: number;
  orgId: string;
  quoteRef: string;
  subject: string;
  planTier: string;
  requestedSeats: number;
  negotiatedSeats: number;
  pricePerSeatInPaise: number;
  contractTermMonths: number;
  contractTerms: string | null;
  status: EnterpriseQuoteStatus;
  approverId: string | null;
  approvalNotes: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  validUntil: string;
  notes: string | null;
  dealId: number | null;
  clientId: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  totalValueInPaise: number;
  deal: { id: number; name: string } | null;
  client: { id: number; name: string } | null;
  approver: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
}

export interface CreateEnterpriseQuoteInput {
  subject: string;
  requestedSeats: number;
  negotiatedSeats: number;
  pricePerSeatInPaise: number;
  contractTermMonths: 12 | 24 | 36;
  contractTerms?: string;
  validUntil: string;
  notes?: string;
  dealId?: number;
  clientId?: number;
}

export interface ListEnterpriseQuotesResponse {
  items: EnterpriseQuoteListItem[];
  total: number;
  page: number;
  totalPages: number;
}

const EQ_KEYS = {
  all: ["enterprise-quotes"] as const,
  list: (filters?: object) => [...EQ_KEYS.all, "list", filters] as const,
  detail: (id: number) => [...EQ_KEYS.all, "detail", id] as const,
};

export function useEnterpriseQuotes(filters?: {
  status?: EnterpriseQuoteStatus;
  page?: number;
}) {
  return useQuery<ListEnterpriseQuotesResponse>({
    queryKey: EQ_KEYS.list(filters),
    queryFn: () =>
      apiClient.get<ListEnterpriseQuotesResponse>(
        "/billing/enterprise-quotes",
        {
          ...(filters?.status ? { status: filters.status } : {}),
          ...(filters?.page ? { page: String(filters.page) } : {}),
        },
      ),
    staleTime: 2 * 60_000,
  });
}

export function useEnterpriseQuote(id: number) {
  return useQuery<EnterpriseQuote>({
    queryKey: EQ_KEYS.detail(id),
    queryFn: () =>
      apiClient.get<EnterpriseQuote>(`/billing/enterprise-quotes/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateEnterpriseQuote() {
  const qc = useQueryClient();
  return useMutation<
    { id: number; quoteRef: string },
    Error,
    CreateEnterpriseQuoteInput
  >({
    mutationFn: (data) =>
      apiClient.post<{ id: number; quoteRef: string }>(
        "/billing/enterprise-quotes",
        data,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EQ_KEYS.all });
    },
  });
}

export function useSubmitEnterpriseQuote() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.post<{ success: boolean }>(
        `/billing/enterprise-quotes/${id}/submit`,
      ),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: EQ_KEYS.all });
      void qc.invalidateQueries({ queryKey: EQ_KEYS.detail(id) });
    },
  });
}

export function useApproveEnterpriseQuote() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, { id: number; notes?: string }>({
    mutationFn: ({ id, notes }) =>
      apiClient.post<{ success: boolean }>(
        `/billing/enterprise-quotes/${id}/approve`,
        { notes },
      ),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: EQ_KEYS.all });
      void qc.invalidateQueries({ queryKey: EQ_KEYS.detail(id) });
    },
  });
}

export function useRejectEnterpriseQuote() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, { id: number; reason: string }>({
    mutationFn: ({ id, reason }) =>
      apiClient.post<{ success: boolean }>(
        `/billing/enterprise-quotes/${id}/reject`,
        { reason },
      ),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: EQ_KEYS.all });
      void qc.invalidateQueries({ queryKey: EQ_KEYS.detail(id) });
    },
  });
}

export function useSendEnterpriseQuote() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.post<{ success: boolean }>(
        `/billing/enterprise-quotes/${id}/send`,
      ),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: EQ_KEYS.all });
      void qc.invalidateQueries({ queryKey: EQ_KEYS.detail(id) });
    },
  });
}

export function useAcceptEnterpriseQuote() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.post<{ success: boolean }>(
        `/billing/enterprise-quotes/${id}/accept`,
      ),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: EQ_KEYS.all });
      void qc.invalidateQueries({ queryKey: EQ_KEYS.detail(id) });
    },
  });
}
