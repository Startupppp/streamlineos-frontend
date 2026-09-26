"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan, useCanState } from "@/hooks/api/access";
import type {
  Risk, Decision,
  CreateRiskInput, UpdateRiskInput,
  CreateDecisionInput, UpdateDecisionInput,
} from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { IdCursorPage } from "@/hooks/api/cursor-page-schema";
import type { RiskStats } from "@/hooks/api/build/governance-schema";


const riskPageContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.riskPageContract),
);
const riskRowContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.riskRowContract),
);
const riskStatsContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.riskStatsContract),
);
const decisionPageContract = lazyContract(() =>
  import("@/hooks/api/build/governance-schema").then((m) => m.decisionPageContract),
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

export const GOVERNANCE_PAGE_SIZE = 100;

interface ListFilters {
  status?: string;
  probability?: string;
  impact?: string;
  ownerId?: string;
  cursor?: number;
}

interface OrgRiskFilters {
  status?: string;
  cursor?: number;
}

export function useOrgRisks(filters?: OrgRiskFilters) {
  const canState = useCanState("build:risks:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.cursor !== undefined) params["cursor"] = String(filters.cursor);

  return useQuery<IdCursorPage<Risk>>({
    queryKey: buildWorkQueryKeys.projects.risks.orgList(Object.keys(params).length > 0 ? params : undefined),
    queryFn: ({ signal }) => apiClient.get<IdCursorPage<Risk>>("/build/risks", params, signal, riskPageContract),
    enabled: canState !== "denied",
    staleTime: 60_000,
  });
}

export function useProjectRisks(projectId: number, filters?: ListFilters) {
  const canView = useCan("build:risks:view");
  const params: Record<string, string> = {};
  if (filters?.status) params["status"] = filters.status;
  if (filters?.probability) params["probability"] = filters.probability;
  if (filters?.impact) params["impact"] = filters.impact;
  if (filters?.ownerId) params["ownerId"] = filters.ownerId;
  if (filters?.cursor !== undefined) params["cursor"] = String(filters.cursor);

  return useQuery<IdCursorPage<Risk>>({
    queryKey: buildWorkQueryKeys.projects.risks.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<IdCursorPage<Risk>>(`/build/${projectId}/risks`, params, signal, riskPageContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useProjectRiskStats(projectId: number) {
  const canView = useCan("build:risks:view");

  return useQuery<RiskStats>({
    queryKey: buildWorkQueryKeys.projects.risks.stats(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<RiskStats>(`/build/${projectId}/risks/stats`, undefined, signal, riskStatsContract),
    enabled: canView && !!projectId,
    staleTime: 2 * 60_000,
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
  if (filters?.ownerId) params["ownerId"] = filters.ownerId;
  if (filters?.cursor !== undefined) params["cursor"] = String(filters.cursor);

  return useQuery<IdCursorPage<Decision>>({
    queryKey: buildWorkQueryKeys.projects.decisions.list(
      projectId,
      Object.keys(params).length > 0 ? params : undefined,
    ),
    queryFn: ({ signal }) => apiClient.get<IdCursorPage<Decision>>(`/build/${projectId}/decisions`, params, signal, decisionPageContract),
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
