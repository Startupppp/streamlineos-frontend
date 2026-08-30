"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface SlaPolicy {
  id: number;
  orgId: string;
  name: string;
  appliesTo: "lead" | "deal" | "both";
  priority: "low" | "medium" | "high" | "urgent";
  firstResponseHours: number;
  resolutionHours: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SlaReport {
  total: number;
  compliant: number;
  breached: number;
  complianceRate: number;
}

interface SlaBreachedLead {
  id: number;
  name: string;
  status: string;
  slaDeadline: string | null;
}

export interface CreateSlaPolicyInput {
  name: string;
  appliesTo: "lead" | "deal" | "both";
  priority: "low" | "medium" | "high" | "urgent";
  firstResponseHours: number;
  resolutionHours: number;
}

export interface UpdateSlaPolicyInput {
  id: number;
  name?: string;
  appliesTo?: "lead" | "deal" | "both";
  priority?: "low" | "medium" | "high" | "urgent";
  firstResponseHours?: number;
  resolutionHours?: number;
}

export function useSlaPolicies() {
  return useGatedQuery("crm:sla:manage", {
    queryKey: queryKeys.crmSettings.slaPolicies(),
    queryFn: () => apiClient.get<SlaPolicy[]>("/crm/sla/policies"),
    staleTime: 2 * 60_000,
  });
}

export function useSlaReport() {
  return useGatedQuery("crm:sla:manage", {
    queryKey: queryKeys.crmSettings.slaReport(),
    queryFn: () => apiClient.get<SlaReport>("/crm/sla/report"),
    staleTime: 2 * 60_000,
  });
}

export function useSlaBreachedLeads(params?: { limit?: number }) {
  return useGatedQuery("crm:sla:manage", {
    queryKey: queryKeys.crmSettings.slaBreachedLeads(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<SlaBreachedLead[]>("/crm/sla/breached", params as Record<string, unknown>),
    staleTime: 2 * 60_000,
  });
}

export function useCreateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "sla-policies", "create"],
    mutationFn: (input: CreateSlaPolicyInput) =>
      apiClient.post<SlaPolicy>("/crm/sla/policies", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}

export function useUpdateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "sla-policies", "update"],
    mutationFn: ({ id, ...data }: UpdateSlaPolicyInput) =>
      apiClient.patch<SlaPolicy>(`/crm/sla/policies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}

export function useDeleteSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm-settings", "sla-policies", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/sla/policies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}
