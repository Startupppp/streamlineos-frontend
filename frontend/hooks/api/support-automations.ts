"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { queryKeyBase as base } from "@/lib/query-keys/base";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationRule,
  AutomationTestResult,
} from "@/hooks/api/automations";
import type { SupportAutomationRun } from "@/hooks/api/support-automations-schema";

const supportAutomationListContract = lazyContract(() =>
  import("@/hooks/api/support-automations-schema").then((m) => m.supportAutomationListContract),
);
const supportAutomationContract = lazyContract(() =>
  import("@/hooks/api/support-automations-schema").then((m) => m.supportAutomationContract),
);
const supportAutomationDeleteContract = lazyContract(() =>
  import("@/hooks/api/support-automations-schema").then((m) => m.supportAutomationDeleteContract),
);
const supportAutomationRunsContract = lazyContract(() =>
  import("@/hooks/api/support-automations-schema").then((m) => m.supportAutomationRunsContract),
);
const supportAutomationTestContract = lazyContract(() =>
  import("@/hooks/api/support-automations-schema").then((m) => m.supportAutomationTestContract),
);

const supportAutomationKeys = {
  all: [...base, "supportAutomations"] as const,
  list: (params?: { page?: number; limit?: number }) =>
    params === undefined
      ? ([...base, "supportAutomations", "list"] as const)
      : ([...base, "supportAutomations", "list", params] as const),
  runs: (automationId: number) =>
    [...base, "supportAutomations", "runs", automationId] as const,
};

export interface SupportPaginatedAutomations {
  data: AutomationRule[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface SupportAutomationListParams {
  page?: number;
  limit?: number;
}

interface CreateSupportAutomationInput {
  name: string;
  description?: string;
  triggerEvent: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isEnabled: boolean;
}

interface UpdateSupportAutomationInput {
  name?: string;
  description?: string | null;
  triggerEvent?: string;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  isEnabled?: boolean;
}

function assertManagePermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission to manage support automations.");
}

export function useSupportAutomations(params?: SupportAutomationListParams) {
  const canManage = useCan("support:settings:manage");
  return useQuery({
    queryKey: supportAutomationKeys.list(params),
    queryFn: ({ signal }) => {
      const search = new URLSearchParams();
      if (params?.page !== undefined) search.set("page", String(params.page));
      if (params?.limit !== undefined) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiClient.get<SupportPaginatedAutomations>(
        `/support/automations${qs ? `?${qs}` : ""}`,
        undefined,
        signal,
        supportAutomationListContract,
      );
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: canManage,
  });
}

export function useSupportAutomationRuns(automationId: number) {
  const canManage = useCan("support:settings:manage");
  return useQuery({
    queryKey: supportAutomationKeys.runs(automationId),
    queryFn: ({ signal }) =>
      apiClient.get<SupportAutomationRun[]>(
        `/support/automation-runs?automationId=${automationId}`,
        undefined,
        signal,
        supportAutomationRunsContract,
      ),
    enabled: canManage && Number.isFinite(automationId) && automationId > 0,
    staleTime: 35_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateSupportAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("support:settings:manage");
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportAutomations", "create"],
    mutationFn: (input: CreateSupportAutomationInput) => {
      assertManagePermission(canManage);
      return apiClient.post<AutomationRule>(
        "/support/automations",
        input,
        undefined,
        supportAutomationContract,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAutomationKeys.all }),
  });
}

export function useUpdateSupportAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("support:settings:manage");
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportAutomations", "update"],
    mutationFn: ({ id, ...input }: UpdateSupportAutomationInput & { id: number }) => {
      assertManagePermission(canManage);
      return apiClient.patch<AutomationRule>(
        `/support/automations/${id}`,
        input,
        undefined,
        supportAutomationContract,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAutomationKeys.all }),
  });
}

export function useToggleSupportAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("support:settings:manage");
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportAutomations", "toggle"],
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) => {
      assertManagePermission(canManage);
      return apiClient.patch<AutomationRule>(
        `/support/automations/${id}`,
        { isEnabled },
        undefined,
        supportAutomationContract,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAutomationKeys.all }),
  });
}

export function useDeleteSupportAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("support:settings:manage");
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportAutomations", "delete"],
    mutationFn: (id: number) => {
      assertManagePermission(canManage);
      return apiClient.delete<{ success: boolean }>(
        `/support/automations/${id}`,
        undefined,
        undefined,
        supportAutomationDeleteContract,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAutomationKeys.all }),
  });
}

export function useTestSupportAutomation() {
  const qc = useQueryClient();
  const canManage = useCan("support:settings:manage");
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportAutomations", "test"],
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      assertManagePermission(canManage);
      return apiClient.post<AutomationTestResult>(
        `/support/automations/${id}/test`,
        { payload },
        undefined,
        supportAutomationTestContract,
      );
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: supportAutomationKeys.runs(variables.id) });
      qc.invalidateQueries({ queryKey: supportAutomationKeys.all });
    },
  });
}

export type { SupportAutomationRun };
