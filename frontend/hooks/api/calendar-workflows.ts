"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isApiError } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { usePermissionGate } from "@/hooks/api/access";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { gated } from "@/lib/rbac/permission-gate";
import type {
  CalendarWorkflowAction,
  CalendarWorkflowChannel,
  CalendarWorkflowDryRun,
  CalendarWorkflowEffect,
  CalendarWorkflowEffectPage,
  CalendarWorkflowPolicy,
  CalendarWorkflowRule,
  CalendarWorkflowTrigger,
} from "./calendar-workflows-schema";

const policyContract = lazyContract(() => import("./calendar-workflows-schema").then((module) => module.calendarWorkflowPolicyContract));
const ruleContract = lazyContract(() => import("./calendar-workflows-schema").then((module) => module.calendarWorkflowRuleContract));
const rulesContract = lazyContract(() => import("./calendar-workflows-schema").then((module) => module.calendarWorkflowRulesContract));
const effectContract = lazyContract(() => import("./calendar-workflows-schema").then((module) => module.calendarWorkflowEffectContract));
const effectsContract = lazyContract(() => import("./calendar-workflows-schema").then((module) => module.calendarWorkflowEffectsContract));
const legacyEffectsContract = lazyContract(() => import("./calendar-workflows-schema").then((module) => module.calendarWorkflowLegacyEffectsContract));
const dryRunContract = lazyContract(() => import("./calendar-workflows-schema").then((module) => module.calendarWorkflowDryRunContract));

export interface CalendarWorkflowPolicyInput {
  expectedVersion: number;
  enabled?: boolean;
  dryRun?: boolean;
  allowedChannels?: CalendarWorkflowChannel[];
  maxRules?: number;
  maxEffectsPerEvent?: number;
  maxEffectsPerDay?: number;
}

export interface CalendarWorkflowRuleInput {
  name: string;
  description: string | null;
  status: "active" | "disabled";
  triggers: CalendarWorkflowTrigger[];
  conditions: Array<{
    field: "aggregate_type" | "lifecycle_state" | "start_at" | "end_at" | "occurrence_id" | "source_key" | "source_status";
    op: "eq" | "neq" | "in" | "exists";
    value?: string | boolean | string[];
  }>;
  actions: CalendarWorkflowAction[];
}

export interface CalendarWorkflowDryRunInput {
  trigger: CalendarWorkflowTrigger;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  actorMembershipId: number | null;
  payload: Record<string, unknown>;
}

const workflowKeys = {
  all: ["calendar", "workflows"] as const,
  policy: ["calendar", "workflows", "policy"] as const,
  rules: ["calendar", "workflows", "rules"] as const,
  effects: ["calendar", "workflows", "effects"] as const,
};

export function useCalendarWorkflowPolicy() {
  return useGatedQuery("calendar:admin:manage", {
    queryKey: workflowKeys.policy,
    queryFn: ({ signal }) => apiClient.get<CalendarWorkflowPolicy>("/calendar/admin/workflows/policy", undefined, signal, policyContract),
    staleTime: 30_000,
  });
}

export function useCalendarWorkflowRules() {
  return useGatedQuery("calendar:admin:manage", {
    queryKey: workflowKeys.rules,
    queryFn: ({ signal }) => apiClient.get<CalendarWorkflowRule[]>("/calendar/admin/workflows/rules", undefined, signal, rulesContract),
    staleTime: 30_000,
  });
}

export function useCalendarWorkflowEffects(status?: CalendarWorkflowEffect["status"]) {
  const access = usePermissionGate("calendar:admin:manage");
  const query = useInfiniteQuery({
    queryKey: [...workflowKeys.effects, status ?? "all"],
    initialPageParam: "",
    queryFn: async ({ pageParam, signal }) => {
      try {
        return await apiClient.get<CalendarWorkflowEffectPage>(
          "/calendar/admin/workflows/effects/page",
          { limit: 50, ...(status ? { status } : {}), ...(pageParam ? { cursor: pageParam } : {}) },
          signal,
          effectsContract,
        );
      } catch (error) {
        if (pageParam || !isApiError(error) || error.status !== 404) throw error;
        const items = await apiClient.get<CalendarWorkflowEffect[]>(
          "/calendar/admin/workflows/effects",
          status ? { status } : undefined,
          signal,
          legacyEffectsContract,
        );
        return { items, nextCursor: null };
      }
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 30_000,
    enabled: access.allowed,
  });
  return gated(query, access);
}

export function useUpdateCalendarWorkflowPolicy() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "workflows", "update-policy"],
    mutationFn: (input: CalendarWorkflowPolicyInput) => apiClient.patch<CalendarWorkflowPolicy>("/calendar/admin/workflows/policy", input, undefined, policyContract),
    onSuccess: (policy) => queryClient.setQueryData(workflowKeys.policy, policy),
  });
}

export function useCreateCalendarWorkflowRule() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "workflows", "create-rule"],
    mutationFn: (input: CalendarWorkflowRuleInput) => apiClient.post<CalendarWorkflowRule>("/calendar/admin/workflows/rules", input, undefined, ruleContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.rules }),
  });
}

export function useUpdateCalendarWorkflowRule() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "workflows", "update-rule"],
    mutationFn: ({ id, expectedVersion, input }: { id: number; expectedVersion: number; input: Partial<CalendarWorkflowRuleInput> }) => apiClient.patch<CalendarWorkflowRule>(`/calendar/admin/workflows/rules/${id}`, { expectedVersion, ...input }, undefined, ruleContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.rules }),
  });
}

export function useDryRunCalendarWorkflow() {
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "workflows", "dry-run"],
    mutationFn: (input: CalendarWorkflowDryRunInput) => apiClient.post<CalendarWorkflowDryRun>("/calendar/admin/workflows/dry-run", input, undefined, dryRunContract),
  });
}

export function useReplayCalendarWorkflowEffect() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "workflows", "replay-effect"],
    mutationFn: ({ id, expectedVersion }: { id: string; expectedVersion: number }) => apiClient.post<CalendarWorkflowEffect>(`/calendar/admin/workflows/effects/${id}/replay`, { expectedVersion }, undefined, effectContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workflowKeys.effects }),
  });
}
