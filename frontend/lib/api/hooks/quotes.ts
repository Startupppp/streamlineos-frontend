"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Quote, QuoteFilters, CreateQuoteInput } from "@/types/crm";

export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: queryKeys.quotes.list(filters as Record<string, unknown>),
    queryFn: () => apiClient.get<{ quotes: Quote[]; total: number }>("/quotes", filters as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useQuoteDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.quotes.detail(id),
    queryFn: () => apiClient.get<Quote>(`/quotes/${id}`),
    staleTime: 2 * 60_000,
    enabled: id > 0,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => apiClient.post<Quote>("/quotes", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/quotes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
    },
  });
}

export function useSendQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Quote>(`/quotes/${id}/send`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.quotes.all });
      qc.invalidateQueries({ queryKey: queryKeys.quotes.detail(id) });
    },
  });
}
