"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  PortfoliosPage,
  PortfolioDetail,
  Portfolio,
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface ListFilters {
  cursor?: string;
  limit?: number;
  status?: string;
}

export function usePortfolios(filters?: ListFilters) {
  const canView = useCan("build:portfolios:view");
  const params: Record<string, string> = {};
  if (filters?.cursor) params["cursor"] = filters.cursor;
  if (filters?.limit) params["limit"] = String(filters.limit);
  if (filters?.status) params["status"] = filters.status;
  return useQuery<PortfoliosPage>({
    queryKey: queryKeys.projects.portfolios.list(Object.keys(params).length > 0 ? params : undefined),
    queryFn: ({ signal }) => apiClient.get<PortfoliosPage>("/build/portfolios", params, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function usePortfolio(id: number) {
  return useGatedQuery<PortfolioDetail>("build:portfolios:view", {
    queryKey: queryKeys.projects.portfolios.detail(id),
    queryFn: ({ signal }) => apiClient.get<PortfolioDetail>(`/build/portfolios/${id}`, undefined, signal),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:portfolios:manage", {
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
  return useAuthorizedMutation("build:portfolios:manage", {
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
  return useAuthorizedMutation("build:portfolios:manage", {
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
  return useAuthorizedMutation("build:portfolios:manage", {
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
  return useAuthorizedMutation("build:portfolios:manage", {
    mutationKey: ["projects", "portfolios", portfolioId, "unlink"],
    mutationFn: (projectId: number) =>
      apiClient.delete<{ success: boolean }>(`/build/portfolios/${portfolioId}/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.detail(portfolioId) });
    },
  });
}
