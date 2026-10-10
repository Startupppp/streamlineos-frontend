"use client";

import { useQueryClient, keepPreviousData, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const goalStatsContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalStatsContract),
);
const goalSuccessContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalSuccessContract),
);
const goalProductLinkContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalProductLinkContract),
);
const goalsListContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalsListContract),
);
const goalRowContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalRowContract),
);
const goalLinkCreatedContract = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalLinkCreatedContract),
);
const goalDetailC = lazyContract(() =>
  import("@/hooks/api/goals-schema").then((m) => m.goalDetailContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { z } from "zod";
import type {
  goalRowContract as goalRowContractDef,
  goalListItemContract as goalListItemContractDef,
  goalsListContract as goalsListContractDef,
  goalLinkCreatedContract as goalLinkCreatedContractDef,
  goalDetailContract as goalDetailContractDef,
  goalProductLinkContract as goalProductLinkContractDef,
} from "@/hooks/api/goals-schema";

export type GoalLevel = "company" | "team" | "individual";
export type GoalStatus = "not_started" | "on_track" | "at_risk" | "off_track" | "completed";
export type KeyResultMetric = "number" | "percentage" | "currency" | "boolean";

type GoalRow = z.infer<typeof goalRowContractDef>;
type GoalProductLink = z.infer<typeof goalProductLinkContractDef>;
export type GoalListItem = z.infer<typeof goalListItemContractDef>;
type GoalsListPage = z.infer<typeof goalsListContractDef>;
type GoalLinkCreated = z.infer<typeof goalLinkCreatedContractDef>;

type GoalDetail = z.infer<typeof goalDetailContractDef>;
export type { GoalDetail };

export type KeyResult = GoalDetail["keyResults"][number];


interface GoalStats {
  total: number;
  byStatus: Record<GoalStatus, number>;
  avgProgress: number;
  atRisk: number;
  completed: number;
  staleCheckIns: number;
}

interface GoalsParams {
  status?: GoalStatus;
  level?: GoalLevel;
  ownerId?: string;
  projectId?: number;
  managedProductId?: number;
  search?: string;
  page?: number;
  limit?: number;
  health?: string;
  due?: string;
  scope?: string;
  metricType?: KeyResultMetric;
}

export interface KeyResultInput {
  title: string;
  metricType?: KeyResultMetric;
  startValue?: number;
  targetValue: number;
  currentValue?: number;
  unit?: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  ownerId?: string;
  level?: GoalLevel;
  status?: GoalStatus;
  startDate?: string;
  dueDate?: string;
  parentGoalId?: number;
  projectId?: number;
  managedProductId?: number;
  keyResults?: KeyResultInput[];
}

interface UpdateGoalInput {
  version: number;
  title?: string;
  description?: string | null;
  ownerId?: string | null;
  level?: GoalLevel;
  status?: GoalStatus;
  startDate?: string | null;
  dueDate?: string | null;
  parentGoalId?: number | null;
  projectId?: number | null;
}

interface CheckInInput {
  keyResultId: number;
  newValue: number;
  note?: string;
}

interface AddGoalLinkInput {
  ticketId?: number;
  projectId?: number;
}

function goalLinksKey(goalId: number) {
  return [...accountingAndSupportQueryKeys.goals.detail(goalId), "links"] as const;
}

function toQueryParams(params?: GoalsParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  return { ...params };
}

export function useGoals(params?: GoalsParams) {
  const queryParams = toQueryParams(params);
  return useGatedQuery("build:goals:view", {
    queryKey: accountingAndSupportQueryKeys.goals.list(queryParams),
    queryFn: async ({ signal }) =>
      (await apiClient.get<GoalsListPage>("/goals", queryParams, signal, goalsListContract)).items,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    ...INLINE_READ_ERROR,
  });
}

export function useGoalsPage(params?: GoalsParams) {
  const queryParams = toQueryParams(params);
  return useGatedQuery("build:goals:view", {
    queryKey: [...accountingAndSupportQueryKeys.goals.list(queryParams), "full-page"],
    queryFn: async ({ signal }) =>
      apiClient.get<GoalsListPage>("/goals", queryParams, signal, goalsListContract),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    ...INLINE_READ_ERROR,
  });
}

export function useGoal(id: number) {
  return useGatedQuery("build:goals:view", {
    queryKey: accountingAndSupportQueryKeys.goals.detail(id),
    queryFn: ({ signal }) =>
      apiClient.get<GoalDetail>(`/goals/${id}`, undefined, signal, goalDetailC),
    enabled: id > 0,
    staleTime: 30_000,
    throwOnError: false,
  });
}

export function useGoalStats(managedProductId?: number) {
  const queryParams = managedProductId === undefined ? undefined : { managedProductId };
  return useGatedQuery("build:goals:view", {
    queryKey: accountingAndSupportQueryKeys.goals.stats(managedProductId),
    queryFn: ({ signal }) => apiClient.get<GoalStats>("/goals/stats", queryParams, signal, goalStatsContract),
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["create", "goal"],
    mutationFn: (input: CreateGoalInput) =>
      apiClient.post<GoalRow>("/goals", input, undefined, goalRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.all });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["update", "goal"],
    mutationFn: ({ id, ...input }: UpdateGoalInput & { id: number }) =>
      apiClient.patch<GoalDetail>(`/goals/${id}`, input, undefined, goalDetailC),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.all });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.detail(variables.id) });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["delete", "goal"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/goals/${id}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.all });
    },
  });
}

export function useCheckIn(goalId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["check", "in"],
    mutationFn: (input: CheckInInput) =>
      apiClient.post<GoalDetail>(`/goals/${goalId}/check-in`, input, undefined, goalDetailC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.detail(goalId) });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.all });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.stats() });
    },
  });
}

export function useAddGoalLink(goalId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["add", "goal", "link"],
    mutationFn: (input: AddGoalLinkInput) =>
      apiClient.post<GoalLinkCreated>(`/goals/${goalId}/links`, input, undefined, goalLinkCreatedContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalLinksKey(goalId) });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.detail(goalId) });
    },
  });
}

export function useRemoveGoalLink(goalId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["remove", "goal", "link"],
    mutationFn: (linkId: number) =>
      apiClient.delete<{ success: boolean }>(`/goals/${goalId}/links?linkId=${linkId}`, undefined, undefined, goalSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalLinksKey(goalId) });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.detail(goalId) });
    },
  });
}

function isGoalsListPage(v: unknown): v is GoalsListPage {
  return (
    typeof v === "object" &&
    v !== null &&
    "items" in v &&
    "total" in v &&
    Array.isArray((v as GoalsListPage).items)
  );
}

function patchGoalListCacheForProduct(
  qc: QueryClient,
  goalId: number,
  managedProductId: number,
  action: "link" | "unlink",
): void {
  const listPrefix = accountingAndSupportQueryKeys.goals.list();
  for (const [key, cached] of qc.getQueriesData({ queryKey: listPrefix })) {
    if (!isGoalsListPage(cached)) continue;
    const keyArr = key as unknown[];
    const params = (keyArr[listPrefix.length] ?? {}) as GoalsParams;
    const isProductScoped =
      typeof params === "object" &&
      "managedProductId" in params &&
      params.managedProductId === managedProductId;

    if (action === "unlink" && isProductScoped) {
      qc.setQueryData(key, (prev: GoalsListPage | undefined) => {
        if (!prev) return prev;
        const newItems = prev.items.filter((item) => item.id !== goalId);
        return { ...prev, items: newItems, total: Math.max(0, prev.total - 1) };
      });
    } else if (action === "link" && isProductScoped) {
      qc.invalidateQueries({ queryKey: key as readonly unknown[], exact: true, refetchType: "active" });
    } else if (!isProductScoped) {
      qc.setQueryData(key, (prev: GoalsListPage | undefined) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === goalId
              ? {
                  ...item,
                  productLinkage:
                    action === "link"
                      ? { managedProductId, linkedAt: new Date().toISOString() }
                      : null,
                }
              : item,
          ),
        };
      });
    }
  }
}

interface LinkGoalProductInput {
  goalId: number;
  managedProductId: number;
}

export function useLinkGoalProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation<GoalProductLink, Error, LinkGoalProductInput>(
    "build:goals:manage",
    {
      mutationKey: ["link", "goal", "product"],
      mutationFn: ({ goalId, managedProductId }) =>
        apiClient.post<GoalProductLink>(
          `/goals/${goalId}/products/${managedProductId}`,
          undefined,
          undefined,
          goalProductLinkContract,
        ),
      onSuccess: (_, variables) => {
        patchGoalListCacheForProduct(qc, variables.goalId, variables.managedProductId, "link");
        qc.invalidateQueries({
          queryKey: accountingAndSupportQueryKeys.goals.stats(variables.managedProductId),
          exact: true,
          refetchType: "none",
        });
      },
    },
  );
}

export function useUnlinkGoalProduct() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, LinkGoalProductInput>(
    "build:goals:manage",
    {
      mutationKey: ["unlink", "goal", "product"],
      mutationFn: ({ goalId, managedProductId }) =>
        apiClient.delete<void>(
          `/goals/${goalId}/products/${managedProductId}`,
          undefined,
          undefined,
          noContentContract,
        ),
      onSuccess: (_, variables) => {
        patchGoalListCacheForProduct(qc, variables.goalId, variables.managedProductId, "unlink");
        qc.invalidateQueries({
          queryKey: accountingAndSupportQueryKeys.goals.stats(variables.managedProductId),
          exact: true,
          refetchType: "none",
        });
      },
    },
  );
}
