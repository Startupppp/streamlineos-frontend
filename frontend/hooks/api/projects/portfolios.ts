"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Portfolio,
  PortfolioDetail,
  Program,
  ProgramDetail,
  CreatePortfolioInput,
  UpdatePortfolioInput,
  CreateProgramInput,
  UpdateProgramInput,
} from "@/types/projects";

interface ListFilters {
  status?: string;
  portfolioId?: number;
}

export function usePortfolios(filters?: Pick<ListFilters, "status">) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  return useQuery<Portfolio[]>({
    queryKey: queryKeys.projects.portfolios.list(Object.keys(params).length > 0 ? params : undefined),
    queryFn: () => apiClient.get<Portfolio[]>("/projects/portfolios", params),
    staleTime: 60_000,
  });
}

export function usePortfolio(id: number) {
  return useQuery<PortfolioDetail>({
    queryKey: queryKeys.projects.portfolios.detail(id),
    queryFn: () => apiClient.get<PortfolioDetail>(`/projects/portfolios/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "portfolios", "create"],
    mutationFn: (data: CreatePortfolioInput) =>
      apiClient.post<Portfolio>("/projects/portfolios", data),
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
      apiClient.patch<Portfolio>(`/projects/portfolios/${id}`, data),
    onSuccess: (_data, vars) => {
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
      apiClient.delete<{ success: boolean }>(`/projects/portfolios/${id}`),
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
      apiClient.post<{ success: boolean }>(`/projects/portfolios/${portfolioId}/projects`, { projectId }),
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
      apiClient.delete<{ success: boolean }>(`/projects/portfolios/${portfolioId}/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.portfolios.detail(portfolioId) });
    },
  });
}

export function usePrograms(filters?: ListFilters) {
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.portfolioId) params["portfolioId"] = String(filters.portfolioId);
  return useQuery<Program[]>({
    queryKey: queryKeys.projects.programs.list(Object.keys(params).length > 0 ? params : undefined),
    queryFn: () => apiClient.get<Program[]>("/projects/programs", params),
    staleTime: 60_000,
  });
}

export function useProgram(id: number) {
  return useQuery<ProgramDetail>({
    queryKey: queryKeys.projects.programs.detail(id),
    queryFn: () => apiClient.get<ProgramDetail>(`/projects/programs/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", "create"],
    mutationFn: (data: CreateProgramInput) =>
      apiClient.post<Program>("/projects/programs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.list() });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", "update"],
    mutationFn: ({ id, ...data }: UpdateProgramInput & { id: number }) =>
      apiClient.patch<Program>(`/projects/programs/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.list() });
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.detail(vars.id) });
    },
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/programs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.list() });
    },
  });
}

export function useLinkProgramProject(programId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", programId, "link"],
    mutationFn: (projectId: number) =>
      apiClient.post<{ success: boolean }>(`/projects/programs/${programId}/projects`, { projectId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.detail(programId) });
    },
  });
}

export function useUnlinkProgramProject(programId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "programs", programId, "unlink"],
    mutationFn: (projectId: number) =>
      apiClient.delete<{ success: boolean }>(`/projects/programs/${programId}/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.programs.detail(programId) });
    },
  });
}
