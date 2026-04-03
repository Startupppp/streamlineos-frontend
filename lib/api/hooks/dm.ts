"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { DmLead, DmCampaign, DmLeadStatus } from "@/types/dm";

interface DmLeadsResponse {
  leads: DmLead[];
  totalCount: number;
  page: number;
  totalPages: number;
}

interface DmLeadFilters {
  status?: DmLeadStatus;
  platform?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface DmCampaignsResponse {
  campaigns: DmCampaign[];
  totalCount: number;
  page: number;
  totalPages: number;
}

interface DmCampaignFilters {
  status?: string;
  page?: number;
  limit?: number;
}

interface CreateDmLeadInput {
  name: string;
  phone?: string;
  email?: string;
  whatsappNumber?: string;
  sourcePlatform: string;
  campaignId?: number;
  campaignType?: string;
  leadQuality?: string;
  notes?: string;
  landingPageUrl?: string;
}

interface CreateDmCampaignInput {
  name: string;
  status?: "active" | "paused" | "completed";
  budgetAllocated?: string;
  budgetSpent?: string;
}

export const useDmLeads = (
  filters?: DmLeadFilters,
  options?: Omit<
    UseQueryOptions<DmLeadsResponse, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DmLeadsResponse, Error>({
    queryKey: queryKeys.dmLeads.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<DmLeadsResponse>("/dm/leads", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.platform ? { platform: filters.platform } : {}),
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    ...options,
  });
};

export const useDmCampaigns = (
  filters?: DmCampaignFilters,
  options?: Omit<
    UseQueryOptions<DmCampaignsResponse, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<DmCampaignsResponse, Error>({
    queryKey: queryKeys.dmCampaigns.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<DmCampaignsResponse>("/dm/campaigns", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    ...options,
  });
};

export const useCreateDmLead = () => {
  const queryClient = useQueryClient();
  return useMutation<DmLead, Error, CreateDmLeadInput>({
    mutationFn: (data) => apiClient.post<DmLead>("/dm/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dmLeads.all });
    },
  });
};

export const useCreateDmCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation<DmCampaign, Error, CreateDmCampaignInput>({
    mutationFn: (data) => apiClient.post<DmCampaign>("/dm/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dmCampaigns.all });
    },
  });
};
