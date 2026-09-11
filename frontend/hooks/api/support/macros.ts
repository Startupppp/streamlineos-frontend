"use client";

import { useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import type { SupportTicketStatus } from "@/types/support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const supportMacroListC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportMacroListContract),
);
const supportMacroRowC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportMacroRowContract),
);
const macroUsageC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.macroUsageContract),
);
const previewMacroC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.previewMacroContract),
);
const applyMacroResultC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.applyMacroResultContract),
);
const supportRoutingRuleListC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportRoutingRuleListContract),
);
const supportRoutingRuleRowC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportRoutingRuleRowContract),
);
const supportAgentSkillListC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportAgentSkillListContract),
);
const setAgentSkillsResultC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.setAgentSkillsResultContract),
);
const supportAgentAvailabilityListC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportAgentAvailabilityListContract),
);
const supportAgentAvailabilityRowC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportAgentAvailabilityRowContract),
);
const supportVipClientListC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportVipClientListContract),
);
const supportSuccessC = lazyContract(() =>
  import("./support-settings-schema").then((m) => m.supportSuccessContract),
);

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type RoutingConditionOp = "eq" | "neq" | "contains";

interface RoutingCondition {
  field: string;
  op: RoutingConditionOp;
  value: string;
}

export type MacroVisibility = "org" | "team" | "private";

export interface MacroActions {
  setStatus?: SupportTicketStatus;
  setPriority?: TicketPriority;
  addTagId?: number;
  isInternal?: boolean;
}

export interface SupportMacro {
  id: number;
  orgId: string;
  title: string;
  body: string;
  category: string | null;
  visibility: string;
  actions: Record<string, unknown>;
  usageCount: number;
  createdByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MacroUsage {
  id: number;
  title: string;
  usageCount: number;
}

export type AssignmentMode = "static" | "round_robin" | "load_balanced" | "skill_based" | "availability_based";

export interface SupportRoutingRule {
  id: number;
  orgId: string;
  name: string;
  conditions: unknown[];
  assigneeMembershipId: number | null;
  setPriority: TicketPriority | null;
  assignmentMode: AssignmentMode;
  candidateAgentIds: string[];
  requiredSkills: string[];
  isEnabled: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportAgentSkill {
  id: number;
  orgId: string;
  userId: string | null;
  userMembershipId: number;
  skill: string;
  createdAt: string;
}

export interface SupportAgentAvailability {
  id: number;
  orgId: string;
  userId: string | null;
  userMembershipId: number;
  isAvailable: boolean;
  updatedAt: string;
}

export interface SupportVipClient {
  id: number;
  orgId: string;
  clientId: number;
  createdAt: string;
}

interface MacrosParams {
  category?: string;
  search?: string;
}

interface CreateMacroInput {
  title: string;
  body: string;
  category?: string;
  visibility?: MacroVisibility;
  actions?: MacroActions;
}

interface UpdateMacroInput {
  title?: string;
  body?: string;
  category?: string | null;
  visibility?: MacroVisibility;
  actions?: MacroActions;
}

interface PreviewMacroInput {
  macroId: number;
  ticketId: number;
}

interface PreviewMacroResult {
  body: string;
}

interface ApplyMacroInput {
  macroId: number;
  ticketId: number;
}

interface ApplyMacroResult {
  body: string;
  isInternal: boolean;
  actionsApplied: Record<string, unknown>;
}

interface CreateRoutingRuleInput {
  name: string;
  conditions: RoutingCondition[];
  assigneeId?: string;
  setPriority?: TicketPriority;
  assignmentMode?: AssignmentMode;
  candidateAgentIds?: string[];
  requiredSkills?: string[];
  isEnabled?: boolean;
  sortOrder?: number;
}

interface UpdateRoutingRuleInput {
  name?: string;
  conditions?: RoutingCondition[];
  assigneeId?: string | null;
  setPriority?: TicketPriority | null;
  assignmentMode?: AssignmentMode;
  candidateAgentIds?: string[];
  requiredSkills?: string[];
  isEnabled?: boolean;
  sortOrder?: number;
}

export function useSupportMacros(params?: MacrosParams) {
  const queryParams: Record<string, unknown> = { ...params };
  return useGatedQuery("support:macros:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportMacros.list(queryParams),
    queryFn: ({ signal }) => apiClient.get<SupportMacro[]>("/support/macros", queryParams, signal, supportMacroListC),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["create", "macro"],
    mutationFn: (input: CreateMacroInput) =>
      apiClient.post<SupportMacro>("/support/macros", input, undefined, supportMacroRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportMacros.all }),
  });
}

export function useUpdateMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["update", "macro"],
    mutationFn: ({ id, ...input }: UpdateMacroInput & { id: number }) =>
      apiClient.patch<SupportMacro>(`/support/macros/${id}`, input, undefined, supportMacroRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportMacros.all }),
  });
}

export function useDeleteMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["delete", "macro"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/macros/${id}`, undefined, undefined, supportSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportMacros.all }),
  });
}

export function useMacroUsage() {
  return useGatedQuery("support:macros:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportMacros.usage(),
    queryFn: ({ signal }) => apiClient.get<MacroUsage[]>("/support/macros/usage", undefined, signal, macroUsageC),
    staleTime: 30_000,
  });
}

export function usePreviewMacro() {
  return useAuthorizedMutation("support:macros:view", {
    mutationKey: ["supportMacros", "preview"],
    mutationFn: ({ macroId, ticketId }: PreviewMacroInput) =>
      apiClient.post<PreviewMacroResult>(`/support/macros/${macroId}/preview`, { ticketId }, undefined, previewMacroC),
  });
}

export function useApplyMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportMacros", "apply"],
    mutationFn: ({ macroId, ticketId }: ApplyMacroInput) =>
      apiClient.post<ApplyMacroResult>(`/support/macros/${macroId}/apply`, { ticketId }, undefined, applyMacroResultC),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportMacros.usage() });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.support.detail(variables.ticketId) });
    },
  });
}

export function useRoutingRules() {
  return useGatedQuery("support:macros:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportRouting.list(),
    queryFn: ({ signal }) => apiClient.get<SupportRoutingRule[]>("/support/routing-rules", undefined, signal, supportRoutingRuleListC),
    staleTime: 60_000,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["create", "routing", "rule"],
    mutationFn: (input: CreateRoutingRuleInput) =>
      apiClient.post<SupportRoutingRule>("/support/routing-rules", input, undefined, supportRoutingRuleRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportRouting.all }),
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["update", "routing", "rule"],
    mutationFn: ({ id, ...input }: UpdateRoutingRuleInput & { id: number }) =>
      apiClient.patch<SupportRoutingRule>(`/support/routing-rules/${id}`, input, undefined, supportRoutingRuleRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportRouting.all }),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["delete", "routing", "rule"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/routing-rules/${id}`, undefined, undefined, supportSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportRouting.all }),
  });
}

export function useAgentSkills() {
  return useGatedQuery("support:macros:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportAgentSkills.list(),
    queryFn: ({ signal }) => apiClient.get<SupportAgentSkill[]>("/support/agent-skills", undefined, signal, supportAgentSkillListC),
    staleTime: 60_000,
  });
}

export function useSetAgentSkills() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["supportAgentSkills", "set"],
    mutationFn: ({ userId, skills }: { userId: string; skills: string[] }) =>
      apiClient.put<{ success: boolean; skills: string[] }>(`/support/agent-skills/${userId}`, { skills }, undefined, setAgentSkillsResultC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportAgentSkills.all }),
  });
}

export function useAgentAvailability() {
  return useGatedQuery("support:macros:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportAgentAvailability.list(),
    queryFn: ({ signal }) => apiClient.get<SupportAgentAvailability[]>("/support/agent-availability", undefined, signal, supportAgentAvailabilityListC),
    staleTime: 30_000,
  });
}

export function useSetMyAvailability() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportAgentAvailability", "setMine"],
    mutationFn: (isAvailable: boolean) =>
      apiClient.put<SupportAgentAvailability>("/support/agent-availability/me", { isAvailable }, undefined, supportAgentAvailabilityRowC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportAgentAvailability.all }),
  });
}

export function useVipClients() {
  return useGatedQuery("support:macros:view", {
    queryKey: supportAndWorkflowsQueryKeys.supportVipClients.list(),
    queryFn: ({ signal }) => apiClient.get<SupportVipClient[]>("/support/vip-clients", undefined, signal, supportVipClientListC),
    staleTime: 60_000,
  });
}

export function useAddVipClient() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["supportVipClients", "add"],
    mutationFn: (clientId: number) =>
      apiClient.post<{ success: boolean }>("/support/vip-clients", { clientId }, undefined, supportSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportVipClients.all }),
  });
}

export function useRemoveVipClient() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["supportVipClients", "remove"],
    mutationFn: (clientId: number) =>
      apiClient.delete<{ success: boolean }>(`/support/vip-clients/${clientId}`, undefined, undefined, supportSuccessC),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportVipClients.all }),
  });
}
