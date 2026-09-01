"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { CrmCampaign, CampaignRoi, CampaignAttribution } from "@/types/crm/campaigns";

interface CampaignListParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface PaginatedCampaigns {
  items: CrmCampaign[];
  total: number;
  page: number;
  limit: number;
}

interface CampaignLeadsParams {
  page?: number;
  limit?: number;
}

type CreateCampaignInput = Omit<CrmCampaign, "id" | "orgId" | "leads" | "spend" | "roi" | "status" | "budgetSpent" | "createdAt" | "updatedAt">;
type UpdateCampaignInput = { id: number } & Partial<CreateCampaignInput>;

export function useCampaigns(params?: CampaignListParams) {
  const p: Record<string, unknown> = {};
  if (params?.page !== undefined) p.page = params.page;
  if (params?.limit !== undefined) p.limit = params.limit;
  if (params?.status && params.status !== "all") p.status = params.status;

  return useGatedQuery("crm:campaigns:view", {
    queryKey: queryKeys.crmCampaigns.list(p),
    queryFn: ({ signal }) => apiClient.get<PaginatedCampaigns>("/crm/campaigns", p, signal),
    staleTime: 2 * 60_000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmCampaigns", "create"] as const,
    mutationFn: (input: CreateCampaignInput) =>
      apiClient.post<CrmCampaign>("/crm/campaigns", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmCampaigns.all });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmCampaigns", "update"] as const,
    mutationFn: ({ id, ...data }: UpdateCampaignInput) =>
      apiClient.patch<CrmCampaign>(`/crm/campaigns/${id}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crmCampaigns.detail(variables.id) });
    },
  });
}

export function useCampaignRoi(campaignId: number) {
  return useGatedQuery("crm:campaigns:view", {
    queryKey: queryKeys.crmCampaigns.roi(campaignId),
    queryFn: ({ signal }) => apiClient.get<CampaignRoi>(`/crm/campaigns/${campaignId}/roi`, undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useCampaignLeads(campaignId: number, params?: CampaignLeadsParams) {
  const p: Record<string, unknown> = {};
  if (params?.page !== undefined) p.page = params.page;
  if (params?.limit !== undefined) p.limit = params.limit;

  return useGatedQuery("crm:campaigns:view", {
    queryKey: queryKeys.crmCampaigns.leads(campaignId, p),
    queryFn: ({ signal }) => apiClient.get<{ items: unknown[]; total: number; page: number; limit: number }>(`/crm/campaigns/${campaignId}/leads`, p, signal),
    staleTime: 60_000,
  });
}

export function useFirstTouchAttribution() {
  return useGatedQuery("crm:reports:view", {
    queryKey: queryKeys.crmCampaigns.attribution("first-touch"),
    queryFn: ({ signal }) => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/first-touch", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useLastTouchAttribution() {
  return useGatedQuery("crm:reports:view", {
    queryKey: queryKeys.crmCampaigns.attribution("last-touch"),
    queryFn: ({ signal }) => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/last-touch", undefined, signal),
    staleTime: 5 * 60_000,
  });
}
