"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export interface Position {
  id: number;
  orgId: string;
  title: string;
  departmentId: number | null;
  jobLevelId: number | null;
  status: "open" | "filled" | "frozen" | "future";
  budgetedCostCents: number | null;
  effectiveFrom: string;
  incumbentUserId: string | null;
  futureDated: boolean;
  createdAt: string;
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
  return useQuery<PositionsListResponse>({
    queryKey: [...POSITIONS_KEY, params],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.departmentId) p["departmentId"] = params.departmentId;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<PositionsListResponse>("/hr/governance/positions", p);
    },
    staleTime: 30_000,
  });
}

export function useVacantPositions(params?: { page?: number; limit?: number }) {
  return useQuery<PositionsListResponse>({
    queryKey: [...POSITIONS_KEY, "vacant", params],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<PositionsListResponse>("/hr/governance/positions/vacant", p);
    },
    staleTime: 30_000,
  });
}

export function useReorgScenarios(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery<ScenariosListResponse>({
    queryKey: [...SCENARIOS_KEY, params],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<ScenariosListResponse>("/hr/governance/scenarios", p);
    },
    staleTime: 30_000,
  });
}

export function useSimulateScenario(scenarioId: number | undefined) {
  return useQuery<SimulationResult>({
    queryKey: [...SCENARIOS_KEY, scenarioId, "simulate"],
    queryFn: () => apiClient.get<SimulationResult>(`/hr/governance/scenarios/${scenarioId}/simulate`),
    enabled: scenarioId !== undefined,
    staleTime: 0,
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation<Position, Error, Omit<Position, "id" | "orgId" | "createdAt">>({
    mutationKey: [...POSITIONS_KEY, "create"],
    mutationFn: (payload) => apiClient.post<Position>("/hr/governance/positions", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POSITIONS_KEY });
      toast.success("Position created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation<Position, Error, { positionId: number; data: Partial<Position & { effectiveFrom: string }> }>({
    mutationKey: [...POSITIONS_KEY, "update"],
    mutationFn: ({ positionId, data }) => apiClient.patch<Position>(`/hr/governance/positions/${positionId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POSITIONS_KEY });
      toast.success("Position updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: [...POSITIONS_KEY, "delete"],
    mutationFn: (positionId) => apiClient.delete<void>(`/hr/governance/positions/${positionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POSITIONS_KEY });
      toast.success("Position deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAssignPosition() {
  const qc = useQueryClient();
  return useMutation<Position, Error, { positionId: number; incumbentUserId: string }>({
    mutationKey: [...POSITIONS_KEY, "assign"],
    mutationFn: ({ positionId, incumbentUserId }) =>
      apiClient.post<Position>(`/hr/governance/positions/${positionId}/assign`, { incumbentUserId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POSITIONS_KEY });
      toast.success("Employee assigned to position");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateReorgScenario() {
  const qc = useQueryClient();
  return useMutation<ReorgScenario, Error, { name: string; changes: Record<string, unknown> }>({
    mutationKey: [...SCENARIOS_KEY, "create"],
    mutationFn: (payload) => apiClient.post<ReorgScenario>("/hr/governance/scenarios", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCENARIOS_KEY });
      toast.success("Reorg scenario created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteReorgScenario() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: [...SCENARIOS_KEY, "delete"],
    mutationFn: (scenarioId) => apiClient.delete<void>(`/hr/governance/scenarios/${scenarioId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCENARIOS_KEY });
      toast.success("Scenario deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
