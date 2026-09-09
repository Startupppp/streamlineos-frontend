"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CrmCampaign,
  CampaignRoi,
  CampaignAttribution,
  AttributionByModelReport,
  AttributionModel,
} from "@/types/crm/campaigns";

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
    queryFn: () => apiClient.get<PaginatedCampaigns>("/crm/campaigns", p),
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
    queryFn: () => apiClient.get<CampaignRoi>(`/crm/campaigns/${campaignId}/roi`),
    staleTime: 2 * 60_000,
  });
}

export function useCampaignLeads(campaignId: number, params?: CampaignLeadsParams) {
  const p: Record<string, unknown> = {};
  if (params?.page !== undefined) p.page = params.page;
  if (params?.limit !== undefined) p.limit = params.limit;

  return useGatedQuery("crm:campaigns:view", {
    queryKey: queryKeys.crmCampaigns.leads(campaignId, p),
    queryFn: () => apiClient.get<{ items: unknown[]; total: number; page: number; limit: number }>(`/crm/campaigns/${campaignId}/leads`, p),
    staleTime: 60_000,
  });
}

/**
 * CRM-P1-01. The same revenue read under any of the five models.
 *
 * Gated on `crm:reports:view` like the two single-touch reports beside it, and
 * for the backend's stated reason: multi-touch is different arithmetic over
 * touches that key already discloses, not a wider disclosure.
 *
 * `halfLifeDays` is sent always and read only by `time_decay`. It is in the
 * query key regardless, because a cached answer under one half-life is the
 * wrong answer for another and the mistake is invisible on screen.
 */
export function useAttributionByModel(model: AttributionModel, halfLifeDays: number) {
  return useGatedQuery("crm:reports:view", {
    queryKey: queryKeys.crmCampaigns.attributionByModel(model, halfLifeDays),
    queryFn: () =>
      apiClient.get<AttributionByModelReport>(
        `/crm/campaigns/attribution/by-model?model=${model}&halfLifeDays=${halfLifeDays}`,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useFirstTouchAttribution() {
  return useGatedQuery("crm:reports:view", {
    queryKey: queryKeys.crmCampaigns.attribution("first-touch"),
    queryFn: () => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/first-touch"),
    staleTime: 5 * 60_000,
  });
}

export function useLastTouchAttribution() {
  return useGatedQuery("crm:reports:view", {
    queryKey: queryKeys.crmCampaigns.attribution("last-touch"),
    queryFn: () => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/last-touch"),
    staleTime: 5 * 60_000,
  });
}
