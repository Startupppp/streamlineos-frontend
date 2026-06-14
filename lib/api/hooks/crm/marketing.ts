"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { MarketingCampaign, EmailCampaign } from "./analytics";

export function useCreateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; status?: string; channel?: string; description?: string; startDate?: string; endDate?: string; targetAudience?: string; budgetAllocated?: string }) =>
      apiClient.post<MarketingCampaign>("/marketing/campaigns", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useUpdateMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<{ name: string; status: string; channel: string; description: string; startDate: string; endDate: string; targetAudience: string; budgetAllocated: string; budgetSpent: string }>) =>
      apiClient.patch<MarketingCampaign>(`/marketing/campaigns/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useDeleteMarketingCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/marketing/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crm.marketingDashboard() });
    },
  });
}

export function useCreateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; subject: string; body: string; templateId?: number; recipientFilter?: Record<string, unknown>; scheduledAt?: string }) =>
      apiClient.post<EmailCampaign>("/marketing/email-campaigns", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useUpdateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<{ name: string; subject: string; body: string; status: string }>) =>
      apiClient.patch<EmailCampaign>(`/marketing/email-campaigns/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useSendEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: number) =>
      apiClient.post<{ sent: number; campaignId: number; status: string }>(`/marketing/email-campaigns/${campaignId}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useDeleteEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/marketing/email-campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useBulkSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, leadIds }: { campaignId: number; leadIds: number[] }) =>
      apiClient.post<{ sent: number; campaignId: number }>(`/marketing/email-campaigns/${campaignId}/bulk-send`, { leadIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.marketingCampaigns.all }),
  });
}

export function useGenerateUtmLink() {
  return useMutation({
    mutationFn: (input: { baseUrl: string; source: string; medium: string; campaign: string; term?: string; content?: string }) =>
      apiClient.post<{ url: string; params: Record<string, string | undefined> }>("/marketing/utm", input),
  });
}
