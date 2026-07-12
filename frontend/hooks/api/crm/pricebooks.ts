"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Pricebook, PricebookEntry, QuoteSettings, QuoteTemplate, ResolvedPrice } from "@/types/crm/pricebooks";

export function usePricebooks() {
  return useQuery({
    queryKey: queryKeys.crmPricebooks.list(),
    queryFn: () => apiClient.get<Pricebook[]>("/crm/pricebooks"),
    staleTime: 5 * 60_000,
  });
}

export function usePricebookEntries(pricebookId: string) {
  return useQuery({
    queryKey: queryKeys.crmPricebooks.entries(pricebookId),
    queryFn: () => apiClient.get<PricebookEntry[]>(`/crm/pricebooks/${pricebookId}/entries`),
    enabled: !!pricebookId,
    staleTime: 2 * 60_000,
  });
}

export function useResolvePrice(productId: number, quantity: number, pricebookId?: string) {
  return useQuery({
    queryKey: [...queryKeys.crmPricebooks.all, "resolve-price", productId, quantity, pricebookId],
    queryFn: () =>
      apiClient.get<ResolvedPrice>("/crm/pricebooks/resolve-price", {
        productId,
        quantity,
        ...(pricebookId ? { pricebookId } : {}),
      }),
    enabled: productId > 0,
    staleTime: 30_000,
  });
}

export function useCreatePricebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "pricebooks", "create"],
    mutationFn: (input: Omit<Pricebook, "id" | "orgId" | "createdAt" | "updatedAt">) =>
      apiClient.post<Pricebook>("/crm/pricebooks", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmPricebooks.all });
    },
  });
}

export function useUpdatePricebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "pricebooks", "update"],
    mutationFn: ({
      id,
      ...data
    }: Partial<Omit<Pricebook, "orgId" | "createdAt" | "updatedAt">> & { id: string }) =>
      apiClient.patch<Pricebook>(`/crm/pricebooks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmPricebooks.all });
    },
  });
}

export function useDeletePricebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "pricebooks", "delete"],
    mutationFn: (id: string) => apiClient.delete<{ success: boolean }>(`/crm/pricebooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmPricebooks.all });
    },
  });
}

export function useUpsertPricebookEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "pricebooks", "entries", "upsert"],
    mutationFn: ({
      pricebookId,
      ...data
    }: { pricebookId: string; productId: number; unitPriceCents: number; minQuantity: number }) =>
      apiClient.post<PricebookEntry>(`/crm/pricebooks/${pricebookId}/entries`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmPricebooks.entries(vars.pricebookId) });
    },
  });
}

export function useDeletePricebookEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "pricebooks", "entries", "delete"],
    mutationFn: ({ pricebookId, entryId }: { pricebookId: string; entryId: string }) =>
      apiClient.delete<{ success: boolean }>(
        `/crm/pricebooks/${pricebookId}/entries/${entryId}`,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmPricebooks.entries(vars.pricebookId) });
    },
  });
}

export function useQuoteSettings() {
  return useQuery({
    queryKey: queryKeys.crmQuoteSettings.all,
    queryFn: () => apiClient.get<QuoteSettings>("/crm/quote-settings"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateQuoteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "quote-settings", "update"],
    mutationFn: (data: Partial<QuoteSettings>) =>
      apiClient.patch<QuoteSettings>("/crm/quote-settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmQuoteSettings.all });
    },
  });
}

export function useQuoteTemplates() {
  return useQuery({
    queryKey: queryKeys.crmQuoteTemplates.list(),
    queryFn: () => apiClient.get<QuoteTemplate[]>("/crm/quote-templates"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateQuoteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "quote-templates", "create"],
    mutationFn: (input: {
      name: string;
      isDefault?: boolean;
      terms?: string;
      branding?: Record<string, unknown>;
    }) => apiClient.post<QuoteTemplate>("/crm/quote-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmQuoteTemplates.all });
    },
  });
}

export function useUpdateQuoteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "quote-templates", "update"],
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      isDefault?: boolean;
      terms?: string;
      branding?: Record<string, unknown>;
    }) => apiClient.patch<QuoteTemplate>(`/crm/quote-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmQuoteTemplates.all });
    },
  });
}

export function useDeleteQuoteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "quote-templates", "delete"],
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/crm/quote-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmQuoteTemplates.all });
    },
  });
}
