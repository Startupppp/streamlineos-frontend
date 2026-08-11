"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
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
  const canView = useCan("crm:campaigns:view");
  const p: Record<string, unknown> = {};
  if (params?.page !== undefined) p.page = params.page;
  if (params?.limit !== undefined) p.limit = params.limit;
  if (params?.status && params.status !== "all") p.status = params.status;

  return useQuery({
    queryKey: queryKeys.crmCampaigns.list(p),
    queryFn: () => apiClient.get<PaginatedCampaigns>("/crm/campaigns", p),
    staleTime: 2 * 60_000,
    enabled: canView,
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
  const canView = useCan("crm:campaigns:view");
  return useQuery({
    queryKey: queryKeys.crmCampaigns.roi(campaignId),
    queryFn: () => apiClient.get<CampaignRoi>(`/crm/campaigns/${campaignId}/roi`),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function useCampaignLeads(campaignId: number, params?: CampaignLeadsParams) {
  const canView = useCan("crm:campaigns:view");
  const p: Record<string, unknown> = {};
  if (params?.page !== undefined) p.page = params.page;
  if (params?.limit !== undefined) p.limit = params.limit;

  return useQuery({
    queryKey: queryKeys.crmCampaigns.leads(campaignId, p),
    queryFn: () => apiClient.get<{ items: unknown[]; total: number; page: number; limit: number }>(`/crm/campaigns/${campaignId}/leads`, p),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useFirstTouchAttribution() {
  const canView = useCan("crm:reports:view");
  return useQuery({
    queryKey: queryKeys.crmCampaigns.attribution("first-touch"),
    queryFn: () => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/first-touch"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useLastTouchAttribution() {
  const canView = useCan("crm:reports:view");
  return useQuery({
    queryKey: queryKeys.crmCampaigns.attribution("last-touch"),
    queryFn: () => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/last-touch"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}
