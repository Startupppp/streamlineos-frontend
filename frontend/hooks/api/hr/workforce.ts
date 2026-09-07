"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useGatedQuery } from "@/hooks/api/gated-query";

const workforcePlansContract = lazyContract(() =>
  import("@/hooks/api/hr/workforce-schema").then((m) => m.workforcePlansContract),
);
const budgetVsActualContract = lazyContract(() =>
  import("@/hooks/api/hr/workforce-schema").then((m) => m.budgetVsActualContract),
);
const skillsGapContract = lazyContract(() =>
  import("@/hooks/api/hr/workforce-schema").then((m) => m.skillsGapContract),
);
const successionRiskContract = lazyContract(() =>
  import("@/hooks/api/hr/workforce-schema").then((m) => m.successionRiskContract),
);
const attritionForecastContract = lazyContract(() =>
  import("@/hooks/api/hr/workforce-schema").then((m) => m.attritionForecastContract),
);
const createHeadcountPlanContract = lazyContract(() =>
  import("@/hooks/api/hr/workforce-schema").then((m) => m.createHeadcountPlanContract),
);
const updateHeadcountPlanContract = lazyContract(() =>
  import("@/hooks/api/hr/workforce-schema").then((m) => m.updateHeadcountPlanContract),
);

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
  all: [...humanResourcesQueryKeys.hr.all, "workforce"] as const,
  plans: () => [...humanResourcesQueryKeys.hr.all, "workforce", "plans"] as const,
  budgetVsActual: () => [...humanResourcesQueryKeys.hr.all, "workforce", "budgetVsActual"] as const,
  skillsGap: () => [...humanResourcesQueryKeys.hr.all, "workforce", "skillsGap"] as const,
  successionRisk: () => [...humanResourcesQueryKeys.hr.all, "workforce", "successionRisk"] as const,
  attritionForecast: () => [...humanResourcesQueryKeys.hr.all, "workforce", "attritionForecast"] as const,
};

export function useHrWorkforcePlans() {
  const canHeadcount = useCan("hr:headcount:read");
  return useQuery({
    queryKey: workforceKeys.plans(),
    queryFn: ({ signal }) => apiClient.get("/hr/analytics-plus/workforce/plans", undefined, signal, workforcePlansContract),
    staleTime: 5 * 60_000,
    enabled: canHeadcount,
  });
}

export function useHrBudgetVsActual() {
  const canHeadcount = useCan("hr:headcount:read");
  return useQuery({
    queryKey: workforceKeys.budgetVsActual(),
    queryFn: ({ signal }) => apiClient.get("/hr/analytics-plus/workforce/budget-vs-actual", undefined, signal, budgetVsActualContract),
    staleTime: 5 * 60_000,
    enabled: canHeadcount,
  });
}

export function useHrSkillsGap() {
  return useGatedQuery("hr:analytics:read", {
    queryKey: workforceKeys.skillsGap(),
    queryFn: ({ signal }) =>
      apiClient.get("/hr/analytics-plus/workforce/skills-gap", undefined, signal, skillsGapContract),
    staleTime: 10 * 60_000,
  });
}

export function useHrSuccessionRisk() {
  const canSuccession = useCan("hr:succession:view");
  return useQuery({
    queryKey: workforceKeys.successionRisk(),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/hr/analytics-plus/workforce/succession-risk", undefined, signal, successionRiskContract,
      ),
    staleTime: 10 * 60_000,
    enabled: canSuccession,
  });
}

export function useHrAttritionForecast() {
  return useGatedQuery("hr:analytics:read", {
    queryKey: workforceKeys.attritionForecast(),
    queryFn: ({ signal }) =>
      apiClient.get("/hr/analytics-plus/workforce/attrition-forecast", undefined, signal, attritionForecastContract),
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
      apiClient.post("/hr/analytics-plus/workforce/plans", data, undefined, createHeadcountPlanContract),
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
      apiClient.patch(`/hr/analytics-plus/workforce/plans/${id}`, data, undefined, updateHeadcountPlanContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workforceKeys.plans() });
      void qc.invalidateQueries({ queryKey: workforceKeys.budgetVsActual() });
    },
  });
}
