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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const quoteListLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteListContract));
const quoteDetailLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteDetailContract));
const quoteLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteContract));
const quoteDeleteLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteDeleteContract));
const quoteConvertLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteConvertToInvoiceContract));


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
    queryFn: ({ signal }) => {
      const p: Record<string, string | number> = {};
      if (params?.status !== undefined) p.status = params.status;
      if (params?.dealId !== undefined) p.dealId = params.dealId;
      if (params?.search !== undefined) p.search = params.search;
      if (params?.cursor !== undefined) p.cursor = params.cursor;
      if (params?.pageSize !== undefined) p.pageSize = params.pageSize;
      return apiClient.get<QuoteListResponse>("/quotes", p, signal, quoteListLazy);
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useQuoteDetail(id: number) {
  return useGatedQuery("crm:quotes:read", {
    queryKey: queryKeys.crmQuotes.detail(id),
    queryFn: ({ signal }) => apiClient.get<Quote>(`/quotes/${id}`, undefined, signal, quoteDetailLazy),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useDealQuotes(dealId: number) {
  return useGatedQuery("crm:quotes:read", {
    queryKey: queryKeys.crmQuotes.byDeal(dealId),
    queryFn: ({ signal }) => apiClient.get<QuoteListResponse>("/quotes", { dealId, pageSize: 100 }, signal, quoteListLazy),
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
  return useAuthorizedMutation("crm:quotes:create", {
    mutationKey: ["quotes", "create"],
    mutationFn: (input: CreateQuoteInput) => apiClient.post<Quote>("/quotes", input, undefined, quoteLazy),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { dealId: vars.dealId }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:quotes:update", {
    mutationKey: ["quotes", "update"],
    mutationFn: ({ id, ...input }: UpdateQuoteInput & { dealId?: number }) =>
      apiClient.patch<Quote>(`/quotes/${id}`, input, undefined, quoteLazy),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:quotes:update", {
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
    }) => apiClient.patch<Quote>(`/quotes/${id}`, { status, rejectionReason }, undefined, quoteLazy),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:quotes:delete", {
    mutationKey: ["quotes", "delete"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.delete<{ success: boolean }>(`/quotes/${id}`, undefined, undefined, quoteDeleteLazy),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { dealId: vars.dealId }),
  });
}

export function downloadQuotesCsv(status?: QuoteStatus): Promise<Blob> {
  return apiClient.download("/quotes/export", status ? { status } : undefined);
}

export function useApproveQuote() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:quotes:approve", {
    mutationKey: ["quotes", "approve"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.post<Quote>(`/quotes/${id}/approve`, undefined, undefined, quoteLazy),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useRejectQuote() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:quotes:approve", {
    mutationKey: ["quotes", "reject"],
    mutationFn: ({ id, reason }: { id: number; reason?: string; dealId?: number }) =>
      apiClient.post<Quote>(`/quotes/${id}/reject`, { reason }, undefined, quoteLazy),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useConvertQuoteToInvoice() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:quotes:create", {
    mutationKey: ["quotes", "convert-to-invoice"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.post<{ invoice: { id: number; invoiceNumber: string }; quoteId: number }>(
        `/quotes/${id}/convert-to-invoice`,
        undefined,
        undefined,
        quoteConvertLazy,
      ),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useMarkQuoteSigned() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:quotes:update", {
    mutationKey: ["quotes", "mark-signed"],
    mutationFn: ({ id, documentRef }: { id: number; documentRef?: string; dealId?: number }) =>
      apiClient.post<Quote>(`/quotes/${id}/mark-signed`, { documentRef }, undefined, quoteLazy),
    onSuccess: (_, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}
