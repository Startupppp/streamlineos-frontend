"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { CrmCampaign, CampaignRoi, CampaignAttribution } from "@/types/crm/campaigns";

interface CampaignListParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface PaginatedCampaigns {
  campaigns: CrmCampaign[];
  total: number;
  page: number;
  limit: number;
}

interface CampaignLeadsParams {
  page?: number;
  limit?: number;
}

type CreateCampaignInput = Omit<CrmCampaign, "id" | "orgId" | "leads" | "spend" | "roi" | "createdAt" | "updatedAt">;
type UpdateCampaignInput = { id: number } & Partial<CreateCampaignInput>;

export function useCampaigns(params?: CampaignListParams) {
  const p: Record<string, unknown> = {};
  if (params?.page !== undefined) p.page = params.page;
  if (params?.limit !== undefined) p.limit = params.limit;
  if (params?.status && params.status !== "all") p.status = params.status;

  return useQuery({
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
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmCampaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.crmCampaigns.detail(variables.id) });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmCampaigns", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmCampaigns.all });
    },
  });
}

export function useCampaignRoi(campaignId: number) {
  return useQuery({
    queryKey: queryKeys.crmCampaigns.roi(campaignId),
    queryFn: () => apiClient.get<CampaignRoi>(`/crm/campaigns/${campaignId}/roi`),
    staleTime: 2 * 60_000,
  });
}

export function useCampaignLeads(campaignId: number, params?: CampaignLeadsParams) {
  const p: Record<string, unknown> = {};
  if (params?.page !== undefined) p.page = params.page;
  if (params?.limit !== undefined) p.limit = params.limit;

  return useQuery({
    queryKey: queryKeys.crmCampaigns.leads(campaignId, p),
    queryFn: () => apiClient.get<{ leads: unknown[]; total: number }>(`/crm/campaigns/${campaignId}/leads`, p),
    staleTime: 60_000,
  });
}

export function useFirstTouchAttribution() {
  return useQuery({
    queryKey: queryKeys.crmCampaigns.attribution("first-touch"),
    queryFn: () => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/first-touch"),
    staleTime: 5 * 60_000,
  });
}

export function useLastTouchAttribution() {
  return useQuery({
    queryKey: queryKeys.crmCampaigns.attribution("last-touch"),
    queryFn: () => apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/last-touch"),
    staleTime: 5 * 60_000,
  });
}
