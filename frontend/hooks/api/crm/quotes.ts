"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Quote, QuoteStatus, CreateQuoteInput, UpdateQuoteInput } from "@/types/crm/quotes";

export function useDealQuotes(dealId: number) {
  return useQuery({
    queryKey: ["quotes", "deal", dealId] as const,
    queryFn: () =>
      apiClient.get<{ quotes: Quote[] }>(`/crm/deals/${dealId}/quotes`),
    enabled: dealId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "create"],
    mutationFn: (input: CreateQuoteInput) =>
      apiClient.post<{ quote: Quote }>("/crm/quotes", input),
    onSuccess: (_data, vars) => {
      if (vars.dealId !== undefined) {
        void qc.invalidateQueries({ queryKey: ["quotes", "deal", vars.dealId] });
      }
    },
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "update"],
    mutationFn: ({ id, dealId: _dealId, ...input }: UpdateQuoteInput & { dealId?: number }) =>
      apiClient.patch<{ quote: Quote }>(`/crm/quotes/${id}`, input),
    onSuccess: (_data, vars) => {
      if (vars.dealId !== undefined) {
        void qc.invalidateQueries({ queryKey: ["quotes", "deal", vars.dealId] });
      }
    },
  });
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "updateStatus"],
    mutationFn: ({ id, status }: { id: number; status: QuoteStatus; dealId: number }) =>
      apiClient.patch<{ quote: Quote }>(`/crm/quotes/${id}/status`, { status }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["quotes", "deal", vars.dealId] });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["quotes", "delete"],
    mutationFn: ({ id }: { id: number; dealId: number }) =>
      apiClient.delete<{ success: boolean }>(`/crm/quotes/${id}`),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["quotes", "deal", vars.dealId] });
    },
  });
}
