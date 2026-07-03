"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Quote,
  QuoteListItem,
  QuoteFilters,
  QuoteStatus,
  CreateQuoteInput,
  UpdateQuoteInput,
} from "@/types/crm/quotes";

export interface QuoteListResponse {
  quotes: QuoteListItem[];
  total: number;
}

export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: queryKeys.crmQuotes.list(filters as Record<string, unknown>),
    queryFn: () => {
      const params: Record<string, string | number> = {};
      if (filters?.status !== undefined) params.status = filters.status;
      if (filters?.dealId !== undefined) params.dealId = filters.dealId;
      if (filters?.search !== undefined) params.search = filters.search;
      if (filters?.page !== undefined) params.page = filters.page;
      if (filters?.pageSize !== undefined) params.pageSize = filters.pageSize;
      return apiClient.get<QuoteListResponse>("/quotes", params);
    },
    staleTime: 2 * 60_000,
  });
}

export function useQuoteDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.crmQuotes.detail(id),
    queryFn: () => apiClient.get<Quote>(`/quotes/${id}`),
    enabled: id > 0,
    staleTime: 2 * 60_000,
  });
}

export function useDealQuotes(dealId: number) {
  return useQuery({
    queryKey: queryKeys.crmQuotes.byDeal(dealId),
    queryFn: () => apiClient.get<QuoteListResponse>("/quotes", { dealId, pageSize: 100 }),
    enabled: dealId > 0,
    staleTime: 2 * 60_000,
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
    onSuccess: (_data, vars) => invalidateQuoteCaches(qc, { dealId: vars.dealId }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "update"],
    mutationFn: ({ id, dealId: _dealId, ...input }: UpdateQuoteInput & { dealId?: number }) =>
      apiClient.patch<Quote>(`/quotes/${id}`, input),
    onSuccess: (_data, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
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
    onSuccess: (_data, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useSendQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "send"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.post<Quote>(`/quotes/${id}/send`),
    onSuccess: (_data, vars) => invalidateQuoteCaches(qc, { id: vars.id, dealId: vars.dealId }),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "delete"],
    mutationFn: ({ id }: { id: number; dealId?: number }) =>
      apiClient.delete<{ success: boolean }>(`/quotes/${id}`),
    onSuccess: (_data, vars) => invalidateQuoteCaches(qc, { dealId: vars.dealId }),
  });
}

export function downloadQuotesCsv(status?: QuoteStatus): Promise<Blob> {
  return apiClient.download("/quotes/export", status ? { status } : undefined);
}
