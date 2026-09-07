"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  PortfoliosPage,
  PortfolioDetail,
  Portfolio,
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


const portfolioPageContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.portfolioPageContract),
);
const portfolioRowContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.portfolioRowContract),
);
const portfolioDetailContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.portfolioDetailContract),
);
const portfoliosSuccessContract = lazyContract(() =>
  import("@/hooks/api/build/portfolios-schema").then((m) => m.portfoliosSuccessContract),
);

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
    queryKey: buildWorkQueryKeys.projects.portfolios.list(Object.keys(params).length > 0 ? params : undefined),
    queryFn: ({ signal }) => apiClient.get<PortfoliosPage>("/build/portfolios", params, signal, portfolioPageContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function usePortfolio(id: number) {
  return useGatedQuery<PortfolioDetail>("build:portfolios:view", {
    queryKey: buildWorkQueryKeys.projects.portfolios.detail(id),
    queryFn: ({ signal }) => apiClient.get<PortfolioDetail>(`/build/portfolios/${id}`, undefined, signal, portfolioDetailContract),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:portfolios:manage", {
    mutationKey: ["projects", "portfolios", "create"],
    mutationFn: (data: CreatePortfolioInput) =>
      apiClient.post<Portfolio>("/build/portfolios", data, undefined, portfolioRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.portfolios.list() });
    },
  });
}

export function useUpdatePortfolio() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:portfolios:manage", {
    mutationKey: ["projects", "portfolios", "update"],
    mutationFn: ({ id, ...data }: UpdatePortfolioInput & { id: number }) =>
      apiClient.patch<Portfolio>(`/build/portfolios/${id}`, data, undefined, portfolioRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.portfolios.list() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.portfolios.detail(vars.id) });
    },
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:portfolios:manage", {
    mutationKey: ["projects", "portfolios", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/portfolios/${id}`, undefined, undefined, portfoliosSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.portfolios.list() });
    },
  });
}

export function useLinkPortfolioProject(portfolioId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:portfolios:manage", {
    mutationKey: ["projects", "portfolios", portfolioId, "link"],
    mutationFn: (projectId: number) =>
      apiClient.post<{ success: boolean }>(`/build/portfolios/${portfolioId}/projects`, { projectId }, undefined, portfoliosSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.portfolios.detail(portfolioId) });
    },
  });
}

export function useUnlinkPortfolioProject(portfolioId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:portfolios:manage", {
    mutationKey: ["projects", "portfolios", portfolioId, "unlink"],
    mutationFn: (projectId: number) =>
      apiClient.delete<{ success: boolean }>(`/build/portfolios/${portfolioId}/projects/${projectId}`, undefined, undefined, portfoliosSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.portfolios.detail(portfolioId) });
    },
  });
}
