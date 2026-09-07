"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import type {
  HrAutomationRule,
  HrAutomationRun,
  HrEventDefinition,
  HrTestResult,
  CreateHrAutomationInput,
  UpdateHrAutomationInput,
} from "@/types/hr/automations";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeyBase } from "@/lib/query-keys/base";

const BASE = [...queryKeyBase, "hr", "automations"] as const;

export const hrAutomationKeys = {
  all: BASE,
  list: (params?: Record<string, unknown>) => [...BASE, "list", params] as const,
  detail: (id: number) => [...BASE, "detail", id] as const,
  runs: (ruleId?: number, params?: Record<string, unknown>) => [...BASE, "runs", ruleId, params] as const,
  events: () => [...BASE, "events"] as const,
};

export function useHrAutomations(params?: { search?: string; triggerEvent?: string; isEnabled?: boolean; page?: number; limit?: number }) {
  const canView = useCan("hr:automations:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: hrAutomationKeys.list(params),
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams();
      if (params?.search) search.set("search", params.search);
      if (params?.triggerEvent) search.set("triggerEvent", params.triggerEvent);
      if (params?.isEnabled !== undefined) search.set("isEnabled", String(params.isEnabled));
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      const page = await apiClient.get<OffsetPage<HrAutomationRule>>(`/hr/automations${qs ? `?${qs}` : ""}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRuleListContract)));
      return page.items;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canView && hrEnabled,
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
  });
}

export interface PaginatedHrAutomationRuns {
  data: HrAutomationRun[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useHrAutomationRuns(ruleId?: number, params?: { page?: number; limit?: number }) {
  const canView = useCan("hr:automations:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: hrAutomationKeys.runs(ruleId, params),
    queryFn: ({ signal }) => {
      const path = ruleId ? `/hr/automations/${ruleId}/runs` : "/hr/automations/runs";
      const search = new URLSearchParams();
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<PaginatedHrAutomationRuns>(`${path}${qs ? `?${qs}` : ""}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRunListContract)));
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    enabled: canView && hrEnabled,
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
    mutationFn: ({ id, ...input }: UpdateHrAutomationInput & { id: number }) =>
      apiClient.patch<HrAutomationRule>(`/hr/automations/${id}`, input, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRuleDetailContract))),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrAutomationKeys.all });
      qc.invalidateQueries({ queryKey: hrAutomationKeys.detail(vars.id) });
    },
  });
}

export function useToggleHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "toggle"],
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      apiClient.post<HrAutomationRule>(`/hr/automations/${id}/toggle`, { isEnabled }, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationRuleDetailContract))),
    onMutate: async ({ id, isEnabled }) => {
      await qc.cancelQueries({ queryKey: hrAutomationKeys.all });
      const previous = qc.getQueriesData<HrAutomationRule[]>({ queryKey: hrAutomationKeys.all });
      qc.setQueriesData<HrAutomationRule[]>({ queryKey: hrAutomationKeys.all }, (old) =>
        Array.isArray(old)
          ? old.map((r) => (r.id === id ? { ...r, isEnabled } : r))
          : old,
      );
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
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/automations/${id}`, undefined, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.successResponseContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useTestHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "test"],
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiClient.post<HrTestResult>(`/hr/automations/${id}/test`, { payload }, undefined, lazyContract(() => import("@/hooks/api/hr/hr-automations-schema").then(m => m.automationTestResultContract))),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrAutomationKeys.runs(vars.id) });
    },
  });
}
