"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export interface HeadcountPlan {
  id: number;
  orgId: string;
  fiscalYear: number;
  departmentId: number | null;
  budgetedHeadcount: number;
  budgetedCostCents: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetVsActual {
  planId: number;
  fiscalYear: number;
  departmentId: number | null;
  departmentName: string;
  budgeted: number;
  actual: number;
  variance: number;
}

export interface SkillsGap {
  skillName: string;
  required: number;
  covered: number;
  gap: number;
}

export interface SuccessionRisk {
  roleName: string;
  incumbentId: string | null;
  readiness: string | null;
  hasSuccessor: boolean;
}

export interface AttritionForecast {
  historical: { month: string; rate: number }[];
  forecast: { month: string; projectedRate: number }[];
  disclaimer: string;
}

const workforceKeys = {
  all: [...queryKeys.hr.all, "workforce"] as const,
  plans: () => [...queryKeys.hr.all, "workforce", "plans"] as const,
  budgetVsActual: () => [...queryKeys.hr.all, "workforce", "budgetVsActual"] as const,
  skillsGap: () => [...queryKeys.hr.all, "workforce", "skillsGap"] as const,
  successionRisk: () => [...queryKeys.hr.all, "workforce", "successionRisk"] as const,
  attritionForecast: () => [...queryKeys.hr.all, "workforce", "attritionForecast"] as const,
};

export function useHrWorkforcePlans() {
  const canHeadcount = useCan("hr:headcount:read");
  return useQuery({
    queryKey: workforceKeys.plans(),
    queryFn: ({ signal }) => apiClient.get<HeadcountPlan[]>("/hr/analytics-plus/workforce/plans", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canHeadcount,
  });
}

export function useHrBudgetVsActual() {
  const canHeadcount = useCan("hr:headcount:read");
  return useQuery({
    queryKey: workforceKeys.budgetVsActual(),
    queryFn: ({ signal }) => apiClient.get<BudgetVsActual[]>("/hr/analytics-plus/workforce/budget-vs-actual", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canHeadcount,
  });
}

export function useHrSkillsGap() {
  return useQuery({
    queryKey: workforceKeys.skillsGap(),
    queryFn: ({ signal }) =>
      apiClient.get<{ gaps: SkillsGap[] }>("/hr/analytics-plus/workforce/skills-gap", undefined, signal),
    staleTime: 10 * 60_000,
  });
}

export function useHrSuccessionRisk() {
  const canSuccession = useCan("hr:succession:view");
  return useQuery({
    queryKey: workforceKeys.successionRisk(),
    queryFn: ({ signal }) =>
      apiClient.get<{ riskyRoles: SuccessionRisk[] }>(
        "/hr/analytics-plus/workforce/succession-risk", undefined, signal,
      ),
    staleTime: 10 * 60_000,
    enabled: canSuccession,
  });
}

export function useHrAttritionForecast() {
  return useQuery({
    queryKey: workforceKeys.attritionForecast(),
    queryFn: ({ signal }) =>
      apiClient.get<AttritionForecast>("/hr/analytics-plus/workforce/attrition-forecast", undefined, signal),
    staleTime: 30 * 60_000,
  });
}

interface CreatePlanInput {
  fiscalYear: number;
  departmentId?: number;
  budgetedHeadcount: number;
  budgetedCostCents?: number;
  note?: string;
}

export function useCreateHeadcountPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workforce:manage", {
    mutationKey: ["hr", "workforce", "createPlan"],
    mutationFn: (data: CreatePlanInput) =>
      apiClient.post<HeadcountPlan>("/hr/analytics-plus/workforce/plans", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workforceKeys.plans() });
      void qc.invalidateQueries({ queryKey: workforceKeys.budgetVsActual() });
    },
  });
}

interface UpdatePlanInput {
  id: number;
  budgetedHeadcount?: number;
  budgetedCostCents?: number;
  note?: string;
}

export function useUpdateHeadcountPlan() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:workforce:manage", {
    mutationKey: ["hr", "workforce", "updatePlan"],
    mutationFn: ({ id, ...data }: UpdatePlanInput) =>
      apiClient.patch<HeadcountPlan>(`/hr/analytics-plus/workforce/plans/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workforceKeys.plans() });
      void qc.invalidateQueries({ queryKey: workforceKeys.budgetVsActual() });
    },
  });
}
