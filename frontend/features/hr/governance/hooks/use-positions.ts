"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const positionListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/positions-schema").then((m) => m.positionListContract),
);
const reorgScenarioListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/positions-schema").then((m) => m.reorgScenarioListContract),
);
const simulationResultContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/positions-schema").then((m) => m.simulationResultContract),
);
const positionDeleteContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/positions-schema").then((m) => m.positionDeleteContract),
);
const positionContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/positions-schema").then((m) => m.positionContract),
);
const positionStatusListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/positions-schema").then((m) => m.positionStatusListContract),
);

export interface Position {
  id: number;
  orgId: string;
  title: string;
  departmentId: string | null;
  jobLevelId: number | null;
  status: "open" | "filled" | "frozen" | "future" | string;
  budgetedCostCents: number | null;
  effectiveFrom: string;
  incumbentUserId: string | null;
  futureDated: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PositionStatus {
  id: number;
  orgId: string;
  name: string;
  order: number;
  color: string | null;
  lifecycleGroup: "backlog" | "unstarted" | "started" | "completed" | "cancelled";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePositionInput {
  title: string;
  status: string;
  effectiveFrom: string;
  departmentId?: string;
  budgetedCostCents?: number;
}

export interface ReorgScenario {
  id: number;
  orgId: string;
  name: string;
  status: "draft" | "proposed" | "applied";
  changes: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}


export function usePositions(params?: { status?: string; departmentId?: number; page?: number; limit?: number }) {
  const canViewPositions = useCan("hr:positions:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrPositionsAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.departmentId) p["departmentId"] = params.departmentId;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/positions", p, signal, positionListContract);
    },
    staleTime: 30_000,
    enabled: canViewPositions,
  });
}

export function useReorgScenarios(params?: { status?: string; page?: number; limit?: number }) {
  const canViewPositions = useCan("hr:positions:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrScenariosAll, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/scenarios", p, signal, reorgScenarioListContract);
    },
    staleTime: 30_000,
    enabled: canViewPositions,
  });
}

export function useSimulateScenario(scenarioId: number | undefined) {
  const canViewPositions = useCan("hr:positions:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrScenariosAll, scenarioId, "simulate"],
    queryFn: ({ signal }) => apiClient.get(`/hr/governance/scenarios/${scenarioId}/simulate`, undefined, signal, simulationResultContract),
    enabled: canViewPositions && scenarioId !== undefined,
    staleTime: 0,
  });
}

export function usePositionStatuses(options?: { enabled?: boolean }) {
  const canViewPositions = useCan("hr:positions:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrPositionsAll, "statuses"],
    queryFn: ({ signal }) =>
      apiClient.get<PositionStatus[]>("/hr/governance/position-taxonomy/statuses", undefined, signal, positionStatusListContract),
    staleTime: 2 * 60_000,
    enabled: canViewPositions && (options?.enabled ?? true),
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Position, Error, CreatePositionInput>("hr:positions:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.hrPositionsAll, "create"],
    mutationFn: (input) => apiClient.post<Position>("/hr/governance/positions", input, undefined, positionContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrPositionsAll });
    },
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:positions:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.hrPositionsAll, "delete"],
    mutationFn: (positionId) => apiClient.delete(`/hr/governance/positions/${positionId}`, undefined, undefined, positionDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrPositionsAll });
      toast.success("Position deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteReorgScenario() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:positions:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.hrScenariosAll, "delete"],
    mutationFn: (scenarioId) => apiClient.delete(`/hr/governance/scenarios/${scenarioId}`, undefined, undefined, positionDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrScenariosAll });
      toast.success("Scenario deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
