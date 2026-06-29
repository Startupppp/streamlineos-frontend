"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type RoutingConditionOp = "eq" | "neq" | "contains";

interface RoutingCondition {
  field: string;
  op: RoutingConditionOp;
  value: string;
}

export interface SupportMacro {
  id: number;
  orgId: string;
  title: string;
  body: string;
  category: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SupportRoutingRule {
  id: number;
  orgId: string;
  name: string;
  conditions: RoutingCondition[];
  assigneeId: string | null;
  setPriority: TicketPriority | null;
  isEnabled: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface MacrosParams {
  category?: string;
  search?: string;
}

interface CreateMacroInput {
  title: string;
  body: string;
  category?: string;
}

interface UpdateMacroInput {
  title?: string;
  body?: string;
  category?: string | null;
}

interface CreateRoutingRuleInput {
  name: string;
  conditions: RoutingCondition[];
  assigneeId?: string;
  setPriority?: TicketPriority;
  isEnabled?: boolean;
  sortOrder?: number;
}

interface UpdateRoutingRuleInput {
  name?: string;
  conditions?: RoutingCondition[];
  assigneeId?: string | null;
  setPriority?: TicketPriority | null;
  isEnabled?: boolean;
  sortOrder?: number;
}

export function useSupportMacros(params?: MacrosParams) {
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: queryKeys.supportMacros.list(queryParams),
    queryFn: () => apiClient.get<SupportMacro[]>("/support/macros", queryParams),
    staleTime: 60_000,
  });
}

export function useCreateMacro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMacroInput) =>
      apiClient.post<SupportMacro>("/support/macros", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportMacros.all }),
  });
}

export function useUpdateMacro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateMacroInput & { id: number }) =>
      apiClient.patch<SupportMacro>(`/support/macros/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportMacros.all }),
  });
}

export function useDeleteMacro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/macros/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportMacros.all }),
  });
}

export function useRoutingRules() {
  return useQuery({
    queryKey: queryKeys.supportRouting.list(),
    queryFn: () => apiClient.get<SupportRoutingRule[]>("/support/routing-rules"),
    staleTime: 60_000,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoutingRuleInput) =>
      apiClient.post<SupportRoutingRule>("/support/routing-rules", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportRouting.all }),
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateRoutingRuleInput & { id: number }) =>
      apiClient.patch<SupportRoutingRule>(`/support/routing-rules/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportRouting.all }),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/support/routing-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportRouting.all }),
  });
}
