"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListBudgetsParams {
  page?: number;
  pageSize?: number;
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
  return useQuery<ListResponse<BudgetSummary>, Error>({
    queryKey: planningKeys.budgets(params),
    queryFn: () =>
      apiClient.get<ListResponse<BudgetSummary>>("/accounting/budgets", toQuery(params)),
    staleTime: 60_000,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation<BudgetSummary, Error, CreateBudgetInput>({
    mutationKey: ["accounting", "planning", "budgets", "create"],
    mutationFn: (data) => apiClient.post<BudgetSummary>("/accounting/budgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useBudget(id: number) {
  return useQuery<BudgetDetail, Error>({
    queryKey: planningKeys.budget(id),
    queryFn: () => apiClient.get<BudgetDetail>(`/accounting/budgets/${id}`),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useReplaceBudgetLines(id: number) {
  const queryClient = useQueryClient();
  return useMutation<BudgetDetail, Error, ReplaceBudgetLinesInput>({
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
  return useMutation<BudgetDetail, Error, BudgetWorkflowInput>({
    mutationKey: ["accounting", "planning", "budgets", id, "submit"],
    mutationFn: (data) => apiClient.post<BudgetDetail>(`/accounting/budgets/${id}/submit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useApproveBudget(id: number) {
  const queryClient = useQueryClient();
  return useMutation<BudgetDetail, Error, BudgetWorkflowInput>({
    mutationKey: ["accounting", "planning", "budgets", id, "approve"],
    mutationFn: (data) => apiClient.post<BudgetDetail>(`/accounting/budgets/${id}/approve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.all });
    },
  });
}

export function useBudgetRevisions(id: number) {
  return useQuery<{ items: BudgetRevision[] }, Error>({
    queryKey: planningKeys.budgetRevisions(id),
    queryFn: () => apiClient.get<{ items: BudgetRevision[] }>(`/accounting/budgets/${id}/revisions`),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useDuplicateBudget(id: number) {
  const queryClient = useQueryClient();
  return useMutation<BudgetSummary, Error, DuplicateBudgetInput>({
    mutationKey: ["accounting", "planning", "budgets", id, "duplicate"],
    mutationFn: (data) => apiClient.post<BudgetSummary>(`/accounting/budgets/${id}/duplicate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.budgets() });
    },
  });
}

export function useBudgetVsActual(id: number, params: BvaParams = {}) {
  return useQuery<BvaResponse, Error>({
    queryKey: planningKeys.bva(id, params),
    queryFn: () =>
      apiClient.get<BvaResponse>(`/accounting/budgets/${id}/vs-actual`, toQuery(params)),
    staleTime: 30_000,
    enabled: id > 0,
  });
}

export function useForecast(params: ForecastParams = {}) {
  return useQuery<ForecastResponse, Error>({
    queryKey: planningKeys.forecast(params),
    queryFn: () =>
      apiClient.get<ForecastResponse>("/accounting/forecast", toQuery(params)),
    staleTime: 60_000,
  });
}

export function useForecastCompare(scenarioIds: number[]) {
  return useQuery<ScenarioCompareResponse, Error>({
    queryKey: planningKeys.forecastCompare(scenarioIds),
    queryFn: () =>
      apiClient.get<ScenarioCompareResponse>("/accounting/forecast/compare", {
        scenarioIds: scenarioIds.join(","),
      }),
    staleTime: 60_000,
    enabled: scenarioIds.length >= 2,
  });
}

export function useScenarios() {
  return useQuery<ListResponse<Scenario>, Error>({
    queryKey: planningKeys.scenarios(),
    queryFn: () => apiClient.get<ListResponse<Scenario>>("/accounting/scenarios"),
    staleTime: 60_000,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation<Scenario, Error, CreateScenarioInput>({
    mutationKey: ["accounting", "planning", "scenarios", "create"],
    mutationFn: (data) => apiClient.post<Scenario>("/accounting/scenarios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.scenarios() });
    },
  });
}

export function useUpdateScenario(id: number) {
  const queryClient = useQueryClient();
  return useMutation<Scenario, Error, UpdateScenarioInput>({
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
  return useMutation<void, Error, void>({
    mutationKey: ["accounting", "planning", "scenarios", id, "delete"],
    mutationFn: () => apiClient.delete<void>(`/accounting/scenarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.scenarios() });
    },
  });
}

export function useSeedDefaultScenarios() {
  const queryClient = useQueryClient();
  return useMutation<{ seeded: number }, Error, void>({
    mutationKey: ["accounting", "planning", "scenarios", "seed"],
    mutationFn: () => apiClient.post<{ seeded: number }>("/accounting/scenarios/seed-defaults", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planningKeys.scenarios() });
    },
  });
}
