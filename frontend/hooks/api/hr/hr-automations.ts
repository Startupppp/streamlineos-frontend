"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import type {
  HrAutomationRule,
  HrAutomationRun,
  HrEventDefinition,
  HrTestResult,
  CreateHrAutomationInput,
  UpdateHrAutomationInput,
} from "@/types/hr/automations";
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
    queryFn: ({ signal }) => {
      const search = new URLSearchParams();
      if (params?.search) search.set("search", params.search);
      if (params?.triggerEvent) search.set("triggerEvent", params.triggerEvent);
      if (params?.isEnabled !== undefined) search.set("isEnabled", String(params.isEnabled));
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<HrAutomationRule[]>(`/hr/automations${qs ? `?${qs}` : ""}`, undefined, signal);
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
    queryFn: ({ signal }) => apiClient.get<{ events: HrEventDefinition[] }>("/hr/automations/events", undefined, signal),
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
      return apiClient.get<PaginatedHrAutomationRuns>(`${path}${qs ? `?${qs}` : ""}`, undefined, signal);
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
      apiClient.post<HrAutomationRule>("/hr/automations", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useUpdateHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "update"],
    mutationFn: ({ id, ...input }: UpdateHrAutomationInput & { id: number }) =>
      apiClient.patch<HrAutomationRule>(`/hr/automations/${id}`, input),
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
      apiClient.post<HrAutomationRule>(`/hr/automations/${id}/toggle`, { isEnabled }),
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
      apiClient.delete<{ success: boolean }>(`/hr/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useTestHrAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:automations:manage", {
    mutationKey: [...BASE, "test"],
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiClient.post<HrTestResult>(`/hr/automations/${id}/test`, { payload }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: hrAutomationKeys.runs(vars.id) });
    },
  });
}
