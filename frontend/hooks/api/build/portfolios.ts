"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Portfolio,
  PortfolioDetail,
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from "@/types/projects";

interface ListFilters {
  status?: string;
}

export function usePortfolios(filters?: ListFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  return useQuery<Portfolio[]>({
    queryKey: queryKeys.projects.portfolios.list(Object.keys(params).length > 0 ? params : undefined),
    queryFn: () => apiClient.get<Portfolio[]>("/build/portfolios", params),
    staleTime: 60_000,
  });
}

export function usePortfolio(id: number) {
  return useQuery<PortfolioDetail>({
    queryKey: queryKeys.projects.portfolios.detail(id),
    queryFn: () => apiClient.get<PortfolioDetail>(`/build/portfolios/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "portfolios", "create"],
    mutationFn: (data: CreatePortfolioInput) =>
      apiClient.post<Portfolio>("/build/portfolios", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.list() });
    },
  });
}

export function useUpdatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "portfolios", "update"],
    mutationFn: ({ id, ...data }: UpdatePortfolioInput & { id: number }) =>
      apiClient.patch<Portfolio>(`/build/portfolios/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.list() });
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.detail(vars.id) });
    },
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "portfolios", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/portfolios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.list() });
    },
  });
}

export function useLinkPortfolioProject(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "portfolios", portfolioId, "link"],
    mutationFn: (projectId: number) =>
      apiClient.post<{ success: boolean }>(`/build/portfolios/${portfolioId}/projects`, { projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.detail(portfolioId) });
    },
  });
}

export function useUnlinkPortfolioProject(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "portfolios", portfolioId, "unlink"],
    mutationFn: (projectId: number) =>
      apiClient.delete<{ success: boolean }>(`/build/portfolios/${portfolioId}/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.detail(portfolioId) });
    },
  });
}
