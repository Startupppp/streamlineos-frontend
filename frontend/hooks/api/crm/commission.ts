"use client";

import { useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys as queryKeys } from "@/lib/query-keys/growth-and-sign";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  CommissionPlanDetail,
  CommissionRuleSet,
} from "@/hooks/api/crm/commission-schema";
import type {
  AccrualParams,
  CommissionAccrual,
  CommissionDealContribution,
  CommissionEarning,
  CommissionPlanSummary,
  CommissionRuleContribution,
  ListEarningsParams,
} from "@/types/crm/commission";

const schema = () => import("@/hooks/api/crm/commission-schema");
const planDetailLazy = lazyContract(() => schema().then((m) => m.commissionPlanDetailContract));
const createPlanLazy = lazyContract(() => schema().then((m) => m.createCommissionPlanContract));
const planLazy = lazyContract(() => schema().then((m) => m.commissionPlanContract));
const versionLazy = lazyContract(() => schema().then((m) => m.commissionVersionContract));
const assignmentLazy = lazyContract(() => schema().then((m) => m.commissionAssignmentContract));
const calculateLazy = lazyContract(() => schema().then((m) => m.calculateCommissionContract));
const rebuildLazy = lazyContract(() => schema().then((m) => m.rebuildAccrualContract));


export function useCommissionPlans() {
  return useGatedQuery("crm:commission-plans:view", {
    queryKey: queryKeys.crmCommission.plans(),
    queryFn: ({ signal }) =>
      apiClient.get<CommissionPlanSummary[]>("/crm/commission/plans", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCommissionEarnings(params?: ListEarningsParams) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.earnings(params),
    queryFn: ({ signal }) => {
      const query: Record<string, string | number> = {};
      if (params?.userId !== undefined) query.userId = params.userId;
      if (params?.planId !== undefined) query.planId = params.planId;
      if (params?.status !== undefined) query.status = params.status;
      if (params?.from !== undefined) query.from = params.from;
      if (params?.to !== undefined) query.to = params.to;
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.offset !== undefined) query.offset = params.offset;
      return apiClient.get<CommissionEarning[]>("/crm/commission/earnings", query, signal);
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCommissionAccrual(params?: AccrualParams) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.accrual(params),
    queryFn: ({ signal }) => {
      const query: Record<string, string> = {};
      if (params?.userId !== undefined) query.userId = params.userId;
      if (params?.planId !== undefined) query.planId = params.planId;
      if (params?.on !== undefined) query.on = params.on;
      return apiClient.get<CommissionAccrual>("/crm/commission/accrual", query, signal);
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCommissionAccrualByDeal(dealId: number) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.accrualByDeal(String(dealId)),
    queryFn: ({ signal }) =>
      apiClient.get<{
        deals: CommissionDealContribution[];
        rules: CommissionRuleContribution[];
      }>("/crm/commission/accrual/by-deal", { dealId }, signal),
    staleTime: 60_000,
    enabled: dealId > 0,
  });
}

export function useCommissionEarningBreakdown(earningId: string) {
  return useGatedQuery("crm:commission-earnings:view", {
    queryKey: queryKeys.crmCommission.earningBreakdown(earningId),
    queryFn: ({ signal }) =>
      apiClient.get<{
        deals: CommissionDealContribution[];
        rules: CommissionRuleContribution[];
      }>(`/crm/commission/accrual/earnings/${earningId}`, undefined, signal),
    staleTime: 60_000,
    enabled: earningId.length > 0,
  });
}

export function useApproveCommissionEarning() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<CommissionEarning, Error, string>(
    "crm:commission-earnings:approve",
    {
      mutationKey: ["crm", "commission", "earnings", "approve"],
      mutationFn: (earningId, idempotencyKey) =>
        apiClient.post<CommissionEarning>(
          `/crm/commission/earnings/${earningId}/approve`,
          {},
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.crmCommission.all });
      },
    },
  );
}

export function useCommissionPlan(planId: string | null) {
  return useGatedQuery("crm:commission-plans:view", {
    queryKey: queryKeys.crmCommission.plan(planId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get(`/crm/commission/plans/${planId}`, undefined, signal, planDetailLazy),
    staleTime: 60_000,
    enabled: planId !== null,
  });
}

function usePatchPlan() {
  const qc = useQueryClient();
  return (planId: string, update: (detail: CommissionPlanDetail) => CommissionPlanDetail) =>
    qc.setQueryData<CommissionPlanDetail>(queryKeys.crmCommission.plan(planId), (current) =>
      current ? update(current) : current,
    );
}

function replaceById<T>(rows: T[], next: T, id: (row: T) => string): T[] {
  return rows.some((row) => id(row) === id(next))
    ? rows.map((row) => (id(row) === id(next) ? next : row))
    : [...rows, next];
}

export interface CreateCommissionPlanInput {
  name: string;
  description?: string;
  currency: string;
  effectiveFrom: string;
  rules: Omit<CommissionRuleSet, "basis"> & { basis: "deal_value" };
  note?: string;
}

export function useCreateCommissionPlan() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation(
    "crm:commission-plans:manage",
    {
      mutationKey: ["crm", "commission", "plans", "create"],
      mutationFn: (input: CreateCommissionPlanInput, idempotencyKey) =>
        apiClient.post("/crm/commission/plans", input, { headers: { "Idempotency-Key": idempotencyKey } }, createPlanLazy),
      onSuccess: ({ plan, version }) => {
        qc.setQueryData<CommissionPlanSummary[]>(queryKeys.crmCommission.plans(), (current) =>
          current ? [...current, plan] : current,
        );
        qc.setQueryData<CommissionPlanDetail>(queryKeys.crmCommission.plan(plan.planId), {
          plan,
          versions: [version],
          assignments: [],
        });
      },
    },
  );
}

export interface UpdateCommissionPlanInput {
  planId: string;
  name?: string;
  description?: string | null;
  retiredOn?: string | null;
}

export function useUpdateCommissionPlan() {
  const qc = useQueryClient();
  const patch = usePatchPlan();
  return useAuthorizedMutation("crm:commission-plans:manage", {
    mutationKey: ["crm", "commission", "plans", "update"],
    mutationFn: ({ planId, ...body }: UpdateCommissionPlanInput) =>
      apiClient.patch(`/crm/commission/plans/${planId}`, body, undefined, planLazy),
    onSuccess: (plan) => {
      patch(plan.planId, (detail) => ({ ...detail, plan }));
      qc.setQueryData<CommissionPlanSummary[]>(queryKeys.crmCommission.plans(), (current) =>
        current?.map((row) => (row.planId === plan.planId ? { ...row, ...plan } : row)),
      );
    },
  });
}

export interface CommissionVersionInput {
  planId: string;
  effectiveFrom: string;
  rules: CreateCommissionPlanInput["rules"];
  note?: string;
}

export function useCreateCommissionVersion() {
  const patch = usePatchPlan();
  return useAuthorizedIdempotentMutation("crm:commission-plans:manage", {
    mutationKey: ["crm", "commission", "versions", "create"],
    mutationFn: ({ planId, ...body }: CommissionVersionInput, idempotencyKey) =>
      apiClient.post(
        `/crm/commission/plans/${planId}/versions`,
        body,
        { headers: { "Idempotency-Key": idempotencyKey } },
        versionLazy,
      ),
    onSuccess: (version) =>
      patch(version.planId, (detail) => ({ ...detail, versions: [...detail.versions, version] })),
  });
}

export function useUpdateCommissionVersion() {
  const patch = usePatchPlan();
  return useAuthorizedMutation("crm:commission-plans:manage", {
    mutationKey: ["crm", "commission", "versions", "update"],
    mutationFn: ({ planId, planVersionId, note, ...body }: CommissionVersionInput & { planVersionId: string }) =>
      apiClient.patch(
        `/crm/commission/plans/${planId}/versions/${planVersionId}`,
        { ...body, note: note ?? null },
        undefined,
        versionLazy,
      ),
    onSuccess: (version) =>
      patch(version.planId, (detail) => ({
        ...detail,
        versions: replaceById(detail.versions, version, (row) => row.planVersionId),
      })),
  });
}

export interface AssignCommissionPlanInput {
  planId: string;
  userId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  quotaOverrideMinor: number | null;
}

export function useAssignCommissionPlan() {
  const patch = usePatchPlan();
  return useAuthorizedMutation("crm:commission-plans:manage", {
    mutationKey: ["crm", "commission", "assignments", "create"],
    mutationFn: ({ planId, ...body }: AssignCommissionPlanInput) =>
      apiClient.post(`/crm/commission/plans/${planId}/assignments`, body, undefined, assignmentLazy),
    onSuccess: (assignment) =>
      patch(assignment.planId, (detail) => ({
        ...detail,
        assignments: [...detail.assignments, assignment],
      })),
  });
}

export function useEndCommissionAssignment() {
  const patch = usePatchPlan();
  return useAuthorizedMutation("crm:commission-plans:manage", {
    mutationKey: ["crm", "commission", "assignments", "end"],
    mutationFn: ({ assignmentId, effectiveTo }: { assignmentId: string; effectiveTo: string }) =>
      apiClient.patch(`/crm/commission/assignments/${assignmentId}/end`, { effectiveTo }, undefined, assignmentLazy),
    onSuccess: (assignment) =>
      patch(assignment.planId, (detail) => ({
        ...detail,
        assignments: replaceById(detail.assignments, assignment, (row) => row.assignmentId),
      })),
  });
}

export function useCalculateCommission() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("crm:commission-earnings:calculate", {
    mutationKey: ["crm", "commission", "earnings", "calculate"],
    mutationFn: (dealId: number, idempotencyKey) =>
      apiClient.post(
        "/crm/commission/earnings/calculate",
        { dealId },
        { headers: { "Idempotency-Key": idempotencyKey } },
        calculateLazy,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmCommission.all });
    },
  });
}

export interface RebuildAccrualInput {
  from: string;
  to: string;
  planId?: string;
}

export function useRebuildCommissionAccrual() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("crm:commission-accruals:rebuild", {
    mutationKey: ["crm", "commission", "accrual", "rebuild"],
    mutationFn: (body: RebuildAccrualInput, idempotencyKey) =>
      apiClient.post(
        "/crm/commission/accrual/rebuild",
        body,
        { headers: { "Idempotency-Key": idempotencyKey } },
        rebuildLazy,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmCommission.accrual(), refetchType: "none" });
    },
  });
}
