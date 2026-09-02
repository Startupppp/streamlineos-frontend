"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SupportTicketStatus } from "@/types/support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  visibility: MacroVisibility;
  actions: MacroActions;
  usageCount: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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
  conditions: RoutingCondition[];
  assigneeId: string | null;
  setPriority: TicketPriority | null;
  assignmentMode: AssignmentMode;
  candidateAgentIds: string[];
  requiredSkills: string[];
  isEnabled: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SupportAgentSkill {
  id: number;
  orgId: string;
  userId: string;
  skill: string;
  createdAt: string | null;
}

export interface SupportAgentAvailability {
  id: number;
  orgId: string;
  userId: string;
  isAvailable: boolean;
  updatedAt: string | null;
}

export interface SupportVipClient {
  id: number;
  orgId: string;
  clientId: number;
  createdAt: string | null;
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
  return useQuery({
    queryKey: queryKeys.supportMacros.list(queryParams),
    queryFn: ({ signal }) => apiClient.get<SupportMacro[]>("/support/macros", queryParams, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["create", "macro"],
    mutationFn: (input: CreateMacroInput) =>
      apiClient.post<SupportMacro>("/support/macros", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportMacros.all }),
  });
}

export function useUpdateMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["update", "macro"],
    mutationFn: ({ id, ...input }: UpdateMacroInput & { id: number }) =>
      apiClient.patch<SupportMacro>(`/support/macros/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportMacros.all }),
  });
}

export function useDeleteMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["delete", "macro"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/macros/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportMacros.all }),
  });
}

export function useMacroUsage() {
  return useQuery({
    queryKey: queryKeys.supportMacros.usage(),
    queryFn: ({ signal }) => apiClient.get<MacroUsage[]>("/support/macros/usage", undefined, signal),
    staleTime: 30_000,
  });
}

export function usePreviewMacro() {
  return useAuthorizedMutation("support:macros:view", {
    mutationKey: ["supportMacros", "preview"],
    mutationFn: ({ macroId, ticketId }: PreviewMacroInput) =>
      apiClient.post<PreviewMacroResult>(`/support/macros/${macroId}/preview`, { ticketId }),
  });
}

export function useApplyMacro() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportMacros", "apply"],
    mutationFn: ({ macroId, ticketId }: ApplyMacroInput) =>
      apiClient.post<ApplyMacroResult>(`/support/macros/${macroId}/apply`, { ticketId }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.supportMacros.usage() });
      qc.invalidateQueries({ queryKey: queryKeys.support.detail(variables.ticketId) });
    },
  });
}

export function useRoutingRules() {
  return useQuery({
    queryKey: queryKeys.supportRouting.list(),
    queryFn: ({ signal }) => apiClient.get<SupportRoutingRule[]>("/support/routing-rules", undefined, signal),
    staleTime: 60_000,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["create", "routing", "rule"],
    mutationFn: (input: CreateRoutingRuleInput) =>
      apiClient.post<SupportRoutingRule>("/support/routing-rules", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportRouting.all }),
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["update", "routing", "rule"],
    mutationFn: ({ id, ...input }: UpdateRoutingRuleInput & { id: number }) =>
      apiClient.patch<SupportRoutingRule>(`/support/routing-rules/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportRouting.all }),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["delete", "routing", "rule"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/routing-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportRouting.all }),
  });
}

export function useAgentSkills() {
  return useQuery({
    queryKey: queryKeys.supportAgentSkills.list(),
    queryFn: ({ signal }) => apiClient.get<SupportAgentSkill[]>("/support/agent-skills", undefined, signal),
    staleTime: 60_000,
  });
}

export function useSetAgentSkills() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportAgentSkills", "set"],
    mutationFn: ({ userId, skills }: { userId: string; skills: string[] }) =>
      apiClient.put<{ success: boolean; skills: string[] }>(`/support/agent-skills/${userId}`, { skills }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportAgentSkills.all }),
  });
}

export function useAgentAvailability() {
  return useQuery({
    queryKey: queryKeys.supportAgentAvailability.list(),
    queryFn: ({ signal }) => apiClient.get<SupportAgentAvailability[]>("/support/agent-availability", undefined, signal),
    staleTime: 30_000,
  });
}

export function useSetMyAvailability() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportAgentAvailability", "setMine"],
    mutationFn: (isAvailable: boolean) =>
      apiClient.put<SupportAgentAvailability>("/support/agent-availability/me", { isAvailable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportAgentAvailability.all }),
  });
}

export function useVipClients() {
  return useQuery({
    queryKey: queryKeys.supportVipClients.list(),
    queryFn: ({ signal }) => apiClient.get<SupportVipClient[]>("/support/vip-clients", undefined, signal),
    staleTime: 60_000,
  });
}

export function useAddVipClient() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:macros:manage", {
    mutationKey: ["supportVipClients", "add"],
    mutationFn: (clientId: number) =>
      apiClient.post<{ success: boolean }>("/support/vip-clients", { clientId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportVipClients.all }),
  });
}

export function useRemoveVipClient() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportVipClients", "remove"],
    mutationFn: (clientId: number) =>
      apiClient.delete<{ success: boolean }>(`/support/vip-clients/${clientId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportVipClients.all }),
  });
}
