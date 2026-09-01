"use client";

import { useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  Quote,
  QuoteListItem,
  QuoteStatus,
  CreateQuoteInput,
  UpdateQuoteInput,
} from "@/types/crm/quotes";

export interface QuoteListResponse {
  quotes: QuoteListItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface QuotesParams {
  status?: QuoteStatus;
  dealId?: number;
  search?: string;
  cursor?: string;
  pageSize?: number;
}

export function useQuotes(params?: QuotesParams) {
  return useGatedQuery("crm:quotes:read", {
    queryKey: queryKeys.crmQuotes.list(params as Record<string, unknown>),
    queryFn: () => {
      const p: Record<string, string | number> = {};
      if (params?.status !== undefined) p.status = params.status;
      if (params?.dealId !== undefined) p.dealId = params.dealId;
      if (params?.search !== undefined) p.search = params.search;
      if (params?.cursor !== undefined) p.cursor = params.cursor;
      if (params?.pageSize !== undefined) p.pageSize = params.pageSize;
      return apiClient.get<QuoteListResponse>("/quotes", p);
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useQuoteDetail(id: number) {
  return useGatedQuery("crm:quotes:read", {
    queryKey: queryKeys.crmQuotes.detail(id),
    queryFn: () => apiClient.get<Quote>(`/quotes/${id}`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useDealQuotes(dealId: number) {
  return useGatedQuery("crm:quotes:read", {
    queryKey: queryKeys.crmQuotes.byDeal(dealId),
    queryFn: () => apiClient.get<QuoteListResponse>("/quotes", { dealId, pageSize: 100 }),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

function invalidateQuoteCaches(
  qc: ReturnType<typeof useQueryClient>,
  vars: { id?: number; dealId?: number },
) {
  void qc.invalidateQueries({ queryKey: queryKeys.crmQuotes.all });
  if (vars.id !== undefined) {
    void qc.invalidateQueries({ queryKey: queryKeys.crmQuotes.detail(vars.id) });
  }
  if (vars.dealId !== undefined) {
    void qc.invalidateQueries({ queryKey: queryKeys.crmQuotes.byDeal(vars.dealId) });
  }
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "create"],
    mutationFn: (input: CreateQuoteInput) => apiClient.post<Quote>("/quotes", input),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { dealId: vars.dealId }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "update"],
    mutationFn: ({ id, ...input }: UpdateQuoteInput & { dealId?: number }) =>
      apiClient.patch<Quote>(`/quotes/${id}`, input),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "updateStatus"],
    mutationFn: ({
      id,
      status,
      rejectionReason,
    }: {
      id: number;
      status: QuoteStatus;
      rejectionReason?: string;
      dealId?: number;
    }) => apiClient.patch<Quote>(`/quotes/${id}`, { status, rejectionReason }),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "delete"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.delete<{ success: boolean }>(`/quotes/${id}`),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { dealId: vars.dealId }),
  });
}

export function downloadQuotesCsv(status?: QuoteStatus): Promise<Blob> {
  return apiClient.download("/quotes/export", status ? { status } : undefined);
}

export function useApproveQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "approve"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.post<Quote>(`/quotes/${id}/approve`),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useRejectQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "reject"],
    mutationFn: ({ id, reason }: { id: number; reason?: string; dealId?: number }) =>
      apiClient.post<Quote>(`/quotes/${id}/reject`, { reason }),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useConvertQuoteToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "convert-to-invoice"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.post<{ invoice: { id: number; invoiceNumber: string }; quoteId: number }>(
        `/quotes/${id}/convert-to-invoice`,
      ),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useMarkQuoteSigned() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "mark-signed"],
    mutationFn: ({ id, documentRef }: { id: number; documentRef?: string; dealId?: number }) =>
      apiClient.post<Quote>(`/quotes/${id}/mark-signed`, { documentRef }),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}
