"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type {
  HrAutomationRule,
  HrAutomationRun,
  HrEventDefinition,
  HrTestResult,
  CreateHrAutomationInput,
  UpdateHrAutomationInput,
} from "@/types/hr/automations";
import { lazyContract } from "@/lib/api-envelope";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
import { queryKeyBase } from "@/lib/query-keys/base";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { hrAutomationsListKey } from "@/hooks/api/hr/hr-automations-schema";
import { hrAutomationsQueryOptions } from "@/hooks/api/hr/hr-automations-read-options";

const BASE = [...queryKeyBase, "hr", "automations"] as const;

export const hrAutomationKeys = {
  all: BASE,
  list: hrAutomationsListKey,
  detail: (id: number) => [...BASE, "detail", id] as const,
  runs: (ruleId?: number, params?: Record<string, unknown>) => [...BASE, "runs", ruleId, params] as const,
  events: () => [...BASE, "events"] as const,
};

type AutomationListParams = Parameters<typeof hrAutomationsQueryOptions>[0];

type AutomationRulePage = {
  data: HrAutomationRule[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};

export function useHrAutomations(params?: AutomationListParams) {
  const canView = useCan("hr:automations:view");
  const hrEnabled = useModuleEnabled("hr");
  return useInfiniteQuery({
    ...hrAutomationsQueryOptions(params),
    queryFn: async ({ pageParam, signal }) => {
      const search = new URLSearchParams();
      if (params?.search) search.set("search", params.search);
      if (params?.triggerEvent) search.set("triggerEvent", params.triggerEvent);
      if (params?.isEnabled !== undefined) search.set("isEnabled", String(params.isEnabled));
      if (params?.limit) search.set("limit", String(params.limit));
      if (pageParam !== null) search.set("cursor", pageParam);
      const qs = search.toString();
      return apiClient.get<AutomationRulePage>(`/hr/automations${qs ? `?${qs}` : ""}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRuleListContract)));
    },
    initialPageParam: NULL_CURSOR_YET,
    getNextPageParam: (page) => page.pagination.nextCursor ?? undefined,
    enabled: canView && hrEnabled,
    ...INLINE_READ_ERROR,
  });
}

export function useHrAutomationEvents() {
  const canView = useCan("hr:automations:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: hrAutomationKeys.events(),
    queryFn: ({ signal }) => apiClient.get<{ events: HrEventDefinition[] }>("/hr/automations/events", undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationEventsListContract))),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
    ...INLINE_READ_ERROR,
  });
}

export interface PaginatedHrAutomationRuns {
  data: HrAutomationRun[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export function useHrAutomationRuns(ruleId?: number, params?: { cursor?: string; limit?: number }) {
  const canView = useCan("hr:automations:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: hrAutomationKeys.runs(ruleId, params),
    queryFn: ({ signal }) => {
      const path = ruleId ? `/hr/automations/${ruleId}/runs` : "/hr/automations/runs";
      const search = new URLSearchParams();
      if (params?.cursor) search.set("cursor", params.cursor);
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<PaginatedHrAutomationRuns>(`${path}${qs ? `?${qs}` : ""}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRunListContract)));
    },
    staleTime: 15_000,
    enabled: canView && hrEnabled,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "create"],
    mutationFn: (input: CreateHrAutomationInput) =>
      apiClient.post<HrAutomationRule>("/hr/automations", input, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRuleDetailContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useUpdateHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "update"],
    mutationFn: ({ automationId, ...input }: UpdateHrAutomationInput & { automationId: number }) =>
      apiClient.patch<HrAutomationRule>(`/hr/automations/${automationId}`, input, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRuleDetailContract))),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrAutomationKeys.all });
      qc.invalidateQueries({ queryKey: hrAutomationKeys.detail(vars.automationId) });
    },
  });
}

export function useToggleHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "toggle"],
    mutationFn: ({ automationId, isEnabled }: { automationId: number; isEnabled: boolean }) =>
      apiClient.post<HrAutomationRule>(`/hr/automations/${automationId}/toggle`, { isEnabled }, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRuleDetailContract))),
    onMutate: async ({ automationId, isEnabled }) => {
      await qc.cancelQueries({ queryKey: hrAutomationKeys.all });
      const previous = qc.getQueriesData<InfiniteData<AutomationRulePage>>({ queryKey: hrAutomationKeys.all });
      qc.setQueriesData<InfiniteData<AutomationRulePage>>({ queryKey: hrAutomationKeys.all }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((r) => (r.id === automationId ? { ...r, isEnabled } : r)),
          })),
        };
      });
      return { previous };
    },
    onError: (_, _vars, ctx) => {
      for (const [key, data] of ctx?.previous ?? []) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useDeleteHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "delete"],
    mutationFn: (automationId: number) =>
      apiClient.delete<void>(`/hr/automations/${automationId}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useTestHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "test"],
    mutationFn: ({ automationId, payload }: { automationId: number; payload: Record<string, unknown> }) =>
      apiClient.post<HrTestResult>(`/hr/automations/${automationId}/test`, { payload }, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationTestResultContract))),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrAutomationKeys.runs(vars.automationId) });
    },
  });
}
