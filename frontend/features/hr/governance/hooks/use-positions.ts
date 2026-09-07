"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export interface ReorgScenario {
  id: number;
  orgId: string;
  name: string;
  status: "draft" | "proposed" | "applied";
  changes: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}

export interface PositionsListResponse {
  data: Position[];
  total: number;
  page: number;
  limit: number;
}

export interface ScenariosListResponse {
  data: ReorgScenario[];
  total: number;
  page: number;
  limit: number;
}

export interface SimulationResult {
  scenarioId: number;
  scenarioName: string;
  status: string;
  projectedEffect: {
    affectedPositions: number;
    affectedReportingLines: number;
    positionMoves: unknown[];
    reportingMoves: unknown[];
  };
  warning: string;
}

const POSITIONS_KEY = ["hr", "governance", "positions"] as const;
const SCENARIOS_KEY = ["hr", "governance", "scenarios"] as const;

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

export function useDeletePosition() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:positions:manage", {
    mutationKey: [...POSITIONS_KEY, "delete"],
    mutationFn: (positionId) => apiClient.delete(`/hr/governance/positions/${positionId}`, undefined, undefined, positionDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POSITIONS_KEY });
      toast.success("Position deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteReorgScenario() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:positions:manage", {
    mutationKey: [...SCENARIOS_KEY, "delete"],
    mutationFn: (scenarioId) => apiClient.delete(`/hr/governance/scenarios/${scenarioId}`, undefined, undefined, positionDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCENARIOS_KEY });
      toast.success("Scenario deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
