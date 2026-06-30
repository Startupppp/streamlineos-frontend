"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Quote, CreateQuoteInput, UpdateQuoteInput } from "@/types/crm/quotes";

export function useDealQuotes(dealId: number) {
  return useQuery({
    queryKey: queryKeys.crmQuotes.byDeal(dealId),
    queryFn: () => apiClient.get<Quote[]>(`/quotes?dealId=${dealId}`),
    staleTime: 2 * 60_000,
    enabled: dealId > 0,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "quotes", "create"],
    mutationFn: (input: CreateQuoteInput) => apiClient.post<Quote>("/quotes", input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmQuotes.all });
      qc.invalidateQueries({ queryKey: queryKeys.crmQuotes.byDeal(vars.dealId ?? 0) });
    },
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "quotes", "update"],
    mutationFn: ({ id, ...data }: UpdateQuoteInput) =>
      apiClient.patch<Quote>(`/quotes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmQuotes.all });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "quotes", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/quotes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmQuotes.all });
    },
  });
}
