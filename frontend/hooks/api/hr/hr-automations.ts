"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  HrAutomationRule,
  HrAutomationRun,
  HrEventDefinition,
  HrTestResult,
  CreateHrAutomationInput,
  UpdateHrAutomationInput,
} from "@/types/hr/automations";

const BASE = ["streamlineos", "hr", "automations"] as const;

export const hrAutomationKeys = {
  all: BASE,
  list: (params?: Record<string, unknown>) => [...BASE, "list", params] as const,
  detail: (id: number) => [...BASE, "detail", id] as const,
  runs: (ruleId?: number) => [...BASE, "runs", ruleId] as const,
  events: () => [...BASE, "events"] as const,
};

export function useHrAutomations(params?: { search?: string; triggerEvent?: string; isEnabled?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: hrAutomationKeys.list(params),
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.search) search.set("search", params.search);
      if (params?.triggerEvent) search.set("triggerEvent", params.triggerEvent);
      if (params?.isEnabled !== undefined) search.set("isEnabled", String(params.isEnabled));
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<HrAutomationRule[]>(`/hr/automations${qs ? `?${qs}` : ""}`);
    },
    staleTime: 30_000,
  });
}

export function useHrAutomation(id: number) {
  return useQuery({
    queryKey: hrAutomationKeys.detail(id),
    queryFn: () => apiClient.get<HrAutomationRule>(`/hr/automations/${id}`),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useHrAutomationEvents() {
  return useQuery({
    queryKey: hrAutomationKeys.events(),
    queryFn: () => apiClient.get<{ events: HrEventDefinition[] }>("/hr/automations/events"),
    staleTime: 5 * 60_000,
  });
}

export function useHrAutomationRuns(ruleId?: number) {
  return useQuery({
    queryKey: hrAutomationKeys.runs(ruleId),
    queryFn: () => {
      const path = ruleId ? `/hr/automations/${ruleId}/runs` : "/hr/automations/runs";
      return apiClient.get<HrAutomationRun[]>(path);
    },
    staleTime: 15_000,
  });
}

export function useCreateHrAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...BASE, "create"],
    mutationFn: (input: CreateHrAutomationInput) =>
      apiClient.post<HrAutomationRule>("/hr/automations", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useUpdateHrAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...BASE, "update"],
    mutationFn: ({ id, ...input }: UpdateHrAutomationInput & { id: number }) =>
      apiClient.patch<HrAutomationRule>(`/hr/automations/${id}`, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: hrAutomationKeys.all });
      qc.invalidateQueries({ queryKey: hrAutomationKeys.detail(vars.id) });
    },
  });
}

export function useToggleHrAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...BASE, "toggle"],
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      apiClient.post<HrAutomationRule>(`/hr/automations/${id}/toggle`, { isEnabled }),
    onMutate: async ({ id, isEnabled }) => {
      await qc.cancelQueries({ queryKey: hrAutomationKeys.list() });
      const previous = qc.getQueryData<HrAutomationRule[]>(hrAutomationKeys.list());
      if (previous) {
        qc.setQueryData<HrAutomationRule[]>(hrAutomationKeys.list(), (old) =>
          (old ?? []).map((r) => (r.id === id ? { ...r, isEnabled } : r)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(hrAutomationKeys.list(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useDeleteHrAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...BASE, "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrAutomationKeys.all }),
  });
}

export function useTestHrAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...BASE, "test"],
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiClient.post<HrTestResult>(`/hr/automations/${id}/test`, { payload }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: hrAutomationKeys.runs(vars.id) });
    },
  });
}
