"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type {
  Risk, Decision,
  CreateRiskInput, UpdateRiskInput,
  CreateDecisionInput, UpdateDecisionInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


const riskListContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.riskListContract),
);
const riskRowContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.riskRowContract),
);
const decisionListContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.decisionListContract),
);
const decisionRowContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.decisionRowContract),
);
const governanceSuccessContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.governanceSuccessContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

interface ListFilters {
  status?: string;
}

export function useProjectRisks(projectId: number, filters?: ListFilters) {
  const canView = useCan("build:risks:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;

  return useQuery<Risk[]>({
    queryKey: buildWorkQueryKeys.projects.risks.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<Risk[]>(`/build/${projectId}/risks`, params, signal, riskListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateRisk(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:risks:manage", {
    mutationKey: ["projects", projectId, "risks", "create"],
    mutationFn: (data: CreateRiskInput) =>
      apiClient.post<Risk>(`/build/${projectId}/risks`, data, undefined, riskRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.risks.list(projectId) });
    },
  });
}

export function useUpdateRisk(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:risks:manage", {
    mutationKey: ["projects", projectId, "risks", "update"],
    mutationFn: ({ riskId, ...data }: UpdateRiskInput & { riskId: number }) =>
      apiClient.patch<Risk>(`/build/${projectId}/risks/${riskId}`, data, undefined, riskRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.risks.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.risks.detail(projectId, vars.riskId) });
    },
  });
}

export function useDeleteRisk(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:risks:manage", {
    mutationKey: ["projects", projectId, "risks", "delete"],
    mutationFn: (riskId: number) =>
      apiClient.delete<void>(`/build/${projectId}/risks/${riskId}`, undefined, undefined, noContentLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.risks.list(projectId) });
    },
  });
}

export function useProjectDecisions(projectId: number, filters?: ListFilters) {
  const canView = useCan("build:decisions:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;

  return useQuery<Decision[]>({
    queryKey: buildWorkQueryKeys.projects.decisions.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<Decision[]>(`/build/${projectId}/decisions`, params, signal, decisionListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateDecision(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:decisions:manage", {
    mutationKey: ["projects", projectId, "decisions", "create"],
    mutationFn: (data: CreateDecisionInput) =>
      apiClient.post<Decision>(`/build/${projectId}/decisions`, data, undefined, decisionRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.decisions.list(projectId) });
    },
  });
}

export function useUpdateDecision(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:decisions:manage", {
    mutationKey: ["projects", projectId, "decisions", "update"],
    mutationFn: ({ decisionId, ...data }: UpdateDecisionInput & { decisionId: number }) =>
      apiClient.patch<Decision>(`/build/${projectId}/decisions/${decisionId}`, data, undefined, decisionRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.decisions.list(projectId) });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.decisions.detail(projectId, vars.decisionId) });
    },
  });
}

export function useDeleteDecision(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:decisions:manage", {
    mutationKey: ["projects", projectId, "decisions", "delete"],
    mutationFn: (decisionId: number) =>
      apiClient.delete<void>(`/build/${projectId}/decisions/${decisionId}`, undefined, undefined, noContentLazy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.decisions.list(projectId) });
    },
  });
}
