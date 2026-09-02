"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import type {
  BudgetDetail,
  BudgetSummary,
  BudgetRevision,
  BudgetStatus,
  BvaResponse,
  CreateBudgetInput,
  DuplicateBudgetInput,
  ForecastResponse,
  ReplaceBudgetLinesInput,
  Scenario,
  ScenarioCompareResponse,
  CreateScenarioInput,
  UpdateScenarioInput,
  BudgetWorkflowInput,
} from "@/types/accounting/planning";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListBudgetsParams {
  cursor?: string;
  limit?: number;
  status?: BudgetStatus;
  fiscalYear?: string;
}

export interface BvaParams {
  from?: string;
  to?: string;
}

export interface ForecastParams {
  weeks?: number;
  scenarioId?: number;
}

const planningKeys = {
  all: [...queryKeys.accounting.all, "planning"] as const,
  budgets: (params?: object) =>
    [...queryKeys.accounting.all, "planning", "budgets", params] as const,
  budget: (id: number) =>
    [...queryKeys.accounting.all, "planning", "budgets", id] as const,
  budgetRevisions: (id: number) =>
    [...queryKeys.accounting.all, "planning", "budgets", id, "revisions"] as const,
  bva: (id: number, params?: object) =>
    [...queryKeys.accounting.all, "planning", "budgets", id, "vs-actual", params] as const,
  forecast: (params?: object) =>
    [...queryKeys.accounting.all, "planning", "forecast", params] as const,
  forecastCompare: (scenarioIds: number[]) =>
    [...queryKeys.accounting.all, "planning", "forecast", "compare", scenarioIds] as const,
  scenarios: () =>
    [...queryKeys.accounting.all, "planning", "scenarios"] as const,
};

function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

export function useBudgets(params: ListBudgetsParams = {}) {
  const can = useCan("accounting:budgets:read");
  return useQuery<CursorPage<BudgetSummary>, Error>({
    queryKey: planningKeys.budgets(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<BudgetSummary>>("/accounting/budgets", toQuery(params), signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BudgetSummary, Error, CreateBudgetInput>("accounting:budgets:create", {
    mutationKey: ["accounting", "planning", "budgets", "create"],
    mutationFn: (data) => apiClient.post<BudgetSummary>("/accounting/budgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useBudget(id: number) {
  const can = useCan("accounting:budgets:read");
  return useQuery<BudgetDetail, Error>({
    queryKey: planningKeys.budget(id),
    queryFn: ({ signal }) => apiClient.get<BudgetDetail>(`/accounting/budgets/${id}`, undefined, signal),
    staleTime: 30_000,
    enabled: can && id > 0,
  });
}

export function useReplaceBudgetLines(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BudgetDetail, Error, ReplaceBudgetLinesInput>("accounting:budgets:update", {
    mutationKey: ["accounting", "planning", "budgets", id, "lines"],
    mutationFn: (data) => apiClient.put<BudgetDetail>(`/accounting/budgets/${id}/lines`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.budget(id) });
      queryClient.invalidateQueries({ queryKey: planningKeys.budgets() });
    },
  });
}

export function useSubmitBudget(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BudgetDetail, Error, BudgetWorkflowInput>("accounting:budgets:update", {
    mutationKey: ["accounting", "planning", "budgets", id, "submit"],
    mutationFn: (data) => apiClient.post<BudgetDetail>(`/accounting/budgets/${id}/submit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useApproveBudget(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BudgetDetail, Error, BudgetWorkflowInput>("accounting:budgets:approve", {
    mutationKey: ["accounting", "planning", "budgets", id, "approve"],
    mutationFn: (data) => apiClient.post<BudgetDetail>(`/accounting/budgets/${id}/approve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useBudgetRevisions(id: number) {
  const can = useCan("accounting:budgets:read");
  return useQuery<{ items: BudgetRevision[] }, Error>({
    queryKey: planningKeys.budgetRevisions(id),
    queryFn: ({ signal }) => apiClient.get<{ items: BudgetRevision[] }>(`/accounting/budgets/${id}/revisions`, undefined, signal),
    staleTime: 30_000,
    enabled: can && id > 0,
  });
}

export function useDuplicateBudget(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BudgetSummary, Error, DuplicateBudgetInput>("accounting:budgets:create", {
    mutationKey: ["accounting", "planning", "budgets", id, "duplicate"],
    mutationFn: (data) => apiClient.post<BudgetSummary>(`/accounting/budgets/${id}/duplicate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.budgets() });
    },
  });
}

export function useBudgetVsActual(id: number, params: BvaParams = {}) {
  const can = useCan("accounting:budgets:read");
  return useQuery<BvaResponse, Error>({
    queryKey: planningKeys.bva(id, params),
    queryFn: ({ signal }) =>
      apiClient.get<BvaResponse>(`/accounting/budgets/${id}/vs-actual`, toQuery(params), signal),
    staleTime: 30_000,
    enabled: can && id > 0,
  });
}

export function useForecast(params: ForecastParams = {}) {
  const can = useCan("accounting:forecast:read");
  return useQuery<ForecastResponse, Error>({
    queryKey: planningKeys.forecast(params),
    queryFn: ({ signal }) =>
      apiClient.get<ForecastResponse>("/accounting/forecast", toQuery(params), signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useForecastCompare(scenarioIds: number[]) {
  const can = useCan("accounting:forecast:read");
  return useQuery<ScenarioCompareResponse, Error>({
    queryKey: planningKeys.forecastCompare(scenarioIds),
    queryFn: ({ signal }) =>
      apiClient.get<ScenarioCompareResponse>("/accounting/forecast/compare", {
        scenarioIds: scenarioIds.join(","),
      }, signal),
    staleTime: 60_000,
    enabled: can && scenarioIds.length >= 2,
  });
}

export function useScenarios() {
  const can = useCan("accounting:forecast:read");
  return useQuery<ListResponse<Scenario>, Error>({
    queryKey: planningKeys.scenarios(),
    queryFn: ({ signal }) => apiClient.get<ListResponse<Scenario>>("/accounting/scenarios", undefined, signal),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Scenario, Error, CreateScenarioInput>("accounting:forecast:manage", {
    mutationKey: ["accounting", "planning", "scenarios", "create"],
    mutationFn: (data) => apiClient.post<Scenario>("/accounting/scenarios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.scenarios() });
    },
  });
}

export function useUpdateScenario(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Scenario, Error, UpdateScenarioInput>("accounting:forecast:manage", {
    mutationKey: ["accounting", "planning", "scenarios", id, "update"],
    mutationFn: (data) => apiClient.patch<Scenario>(`/accounting/scenarios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.scenarios() });
      queryClient.invalidateQueries({ queryKey: planningKeys.forecast() });
    },
  });
}

export function useDeleteScenario(id: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, void>("accounting:forecast:manage", {
    mutationKey: ["accounting", "planning", "scenarios", id, "delete"],
    mutationFn: () => apiClient.delete<void>(`/accounting/scenarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.scenarios() });
    },
  });
}

export function useSeedDefaultScenarios() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ seeded: number }, Error, void>("accounting:forecast:manage", {
    mutationKey: ["accounting", "planning", "scenarios", "seed"],
    mutationFn: () => apiClient.post<{ seeded: number }>("/accounting/scenarios/seed-defaults", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.scenarios() });
    },
  });
}
