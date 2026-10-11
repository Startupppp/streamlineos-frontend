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

function toQueryParams(params?: GoalsParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  return { ...params };
}

type GoalsListCache = GoalListItem[] | GoalsListPage;

function patchGoalInListItem(ex: GoalListItem, up: GoalDetail): GoalListItem {
  const { keyResults: _1, updates: _2, links: _3, project: _4, measurementSources: _5, linkedRoadmapItems: _6, ...shared } = up;
  return { ...ex, ...shared };
}

function patchGoalsListCache(cache: GoalsListCache | undefined, up: GoalDetail): GoalsListCache | undefined {
  if (!cache) return cache;
  const patch = (i: GoalListItem) => i.id === up.id ? patchGoalInListItem(i, up) : i;
  return Array.isArray(cache) ? cache.map(patch) : { ...cache, items: cache.items.map(patch) };
}

function removeGoalFromListCache(cache: GoalsListCache | undefined, id: number): GoalsListCache | undefined {
  if (!cache) return cache;
  const keep = (i: GoalListItem) => i.id !== id;
  return Array.isArray(cache)
    ? cache.filter(keep)
    : { ...cache, items: cache.items.filter(keep), total: Math.max(0, cache.total - 1) };
}

function forEachGoalList(
  qc: QueryClient,
  fn: (cache: GoalsListCache) => GoalsListCache | undefined,
): void {
  for (const [key, cache] of qc.getQueriesData<GoalsListCache>({
    queryKey: accountingAndSupportQueryKeys.goals.list(),
  })) {
    if (cache === undefined) continue;
    qc.setQueryData<GoalsListCache>(key, fn(cache));
  }
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
    onSuccess: (created, input) => {
      const newDetail: GoalDetail = {
        ...created, owner: null, project: null,
        keyResults: [], updates: [], links: [], measurementSources: [], linkedRoadmapItems: [],
      };
      const newItem: GoalListItem = {
        ...created, target: null, current: null, owner: null,
        keyResultCount: input.keyResults?.length ?? 0,
        linkCount: 0, linkedTicketCount: 0, linkedProjectCount: 0,
        productLinkage: null, linkedRoadmapItemCount: 0, linkedOpportunityCount: 0,
        outcomeReviews: null, lastCheckInAt: null, checkInFreshness: "none",
      };
      qc.setQueryData(accountingAndSupportQueryKeys.goals.detail(created.id), newDetail);
      forEachGoalList(qc, (cache) =>
        Array.isArray(cache)
          ? [newItem, ...cache]
          : { ...cache, items: [newItem, ...cache.items], total: cache.total + 1 },
      );
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.stats(), refetchType: "none" });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["update", "goal"],
    mutationFn: ({ id, ...input }: UpdateGoalInput & { id: number }) =>
      apiClient.patch<GoalDetail>(`/goals/${id}`, input, undefined, goalDetailC),
    onSuccess: (updated, variables) => {
      qc.setQueryData(accountingAndSupportQueryKeys.goals.detail(variables.id), updated);
      forEachGoalList(qc, (cache) => patchGoalsListCache(cache, updated));
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.stats(), refetchType: "none" });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["delete", "goal"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/goals/${id}`, undefined, undefined, noContentContract),
    onSuccess: (_, goalId) => {
      forEachGoalList(qc, (cache) => removeGoalFromListCache(cache, goalId));
      qc.removeQueries({ queryKey: accountingAndSupportQueryKeys.goals.detail(goalId), exact: true });
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.stats(), refetchType: "none" });
    },
  });
}

export function useCheckIn(goalId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["check", "in"],
    mutationFn: (input: CheckInInput) =>
      apiClient.post<GoalDetail>(`/goals/${goalId}/check-in`, input, undefined, goalDetailC),
    onSuccess: (updated) => {
      qc.setQueryData(accountingAndSupportQueryKeys.goals.detail(goalId), updated);
      forEachGoalList(qc, (cache) => patchGoalsListCache(cache, updated));
      qc.invalidateQueries({ queryKey: accountingAndSupportQueryKeys.goals.stats(), refetchType: "none" });
    },
  });
}

export function useAddGoalLink(goalId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["add", "goal", "link"],
    mutationFn: (input: AddGoalLinkInput) =>
      apiClient.post<GoalLinkCreated>(`/goals/${goalId}/links`, input, undefined, goalLinkCreatedContract),
    onSuccess: (created) => {
      qc.setQueryData<GoalDetail>(accountingAndSupportQueryKeys.goals.detail(goalId), (prev) => {
        if (!prev) return prev;
        const newLink = { id: created.id, ticketId: created.ticketId, projectId: created.projectId,
          createdAt: created.createdAt, ticketTitle: null, ticketProjectId: null, projectName: null, projectKey: null };
        return { ...prev, links: [...prev.links, newLink] };
      });
      const patchItem = (item: GoalListItem): GoalListItem => {
        if (item.id !== goalId) return item;
        return {
          ...item,
          linkCount: item.linkCount + 1,
          linkedTicketCount: created.ticketId !== null ? item.linkedTicketCount + 1 : item.linkedTicketCount,
          linkedProjectCount: created.projectId !== null ? item.linkedProjectCount + 1 : item.linkedProjectCount,
        };
      };
      forEachGoalList(qc, (cache) =>
        Array.isArray(cache) ? cache.map(patchItem) : { ...cache, items: cache.items.map(patchItem) },
      );
    },
  });
}

export function useRemoveGoalLink(goalId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:goals:manage", {
    mutationKey: ["remove", "goal", "link"],
    mutationFn: (linkId: number) =>
      apiClient.delete<{ success: boolean }>(`/goals/${goalId}/links?linkId=${linkId}`, undefined, undefined, goalSuccessContract),
    onSuccess: (_, linkId) => {
      const prev = qc.getQueryData<GoalDetail>(accountingAndSupportQueryKeys.goals.detail(goalId));
      const removed = prev?.links.find((l) => l.id === linkId);
      qc.setQueryData<GoalDetail>(accountingAndSupportQueryKeys.goals.detail(goalId), (d) => {
        if (!d) return d;
        return { ...d, links: d.links.filter((l) => l.id !== linkId) };
      });
      const patchItem = (item: GoalListItem): GoalListItem => {
        if (item.id !== goalId) return item;
        return {
          ...item,
          linkCount: Math.max(0, item.linkCount - 1),
          linkedTicketCount: removed?.ticketId != null ? Math.max(0, item.linkedTicketCount - 1) : item.linkedTicketCount,
          linkedProjectCount: removed?.projectId != null ? Math.max(0, item.linkedProjectCount - 1) : item.linkedProjectCount,
        };
      };
      forEachGoalList(qc, (cache) =>
        Array.isArray(cache) ? cache.map(patchItem) : { ...cache, items: cache.items.map(patchItem) },
      );
    },
  });
}

function isGoalsListPage(v: unknown): v is GoalsListPage {
  return (
    typeof v === "object" && v !== null && "items" in v && "total" in v &&
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
      typeof params === "object" && "managedProductId" in params &&
      params.managedProductId === managedProductId;

    if (action === "unlink" && isProductScoped) {
      qc.setQueryData(key, (prev: GoalsListPage | undefined) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((item) => item.id !== goalId), total: Math.max(0, prev.total - 1) };
      });
    } else if (action === "link" && isProductScoped) {
      qc.invalidateQueries({ queryKey: key as readonly unknown[], exact: true, refetchType: "none" });
    } else if (!isProductScoped) {
      qc.setQueryData(key, (prev: GoalsListPage | undefined) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === goalId
              ? { ...item, productLinkage: action === "link" ? { managedProductId, linkedAt: new Date().toISOString() } : null }
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
