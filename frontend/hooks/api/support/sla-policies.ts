"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type SlaPolicyPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type SlaPauseStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";

export interface SlaPolicy {
  id: number;
  orgId: string;
  name: string;
  priority: SlaPolicyPriority | null;
  category: string | null;
  businessHoursId: number | null;
  firstResponseTargetMins: number;
  resolutionTargetMins: number;
  pauseStatuses: SlaPauseStatus[];
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlaPolicyInput {
  name: string;
  priority?: SlaPolicyPriority;
  category?: string;
  businessHoursId?: number;
  firstResponseTargetMins: number;
  resolutionTargetMins: number;
  pauseStatuses?: SlaPauseStatus[];
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface UpdateSlaPolicyInput {
  name?: string;
  priority?: SlaPolicyPriority | null;
  category?: string | null;
  businessHoursId?: number | null;
  firstResponseTargetMins?: number;
  resolutionTargetMins?: number;
  pauseStatuses?: SlaPauseStatus[];
  isEnabled?: boolean;
  sortOrder?: number;
}

export function useSlaPoliciesList() {
  return useGatedQuery("support:settings:manage", {
    queryKey: supportAndWorkflowsQueryKeys.supportSlaPolicies.list(),
    queryFn: ({ signal }) => apiClient.get<SlaPolicy[]>("/support/sla-policies", undefined, signal),
    staleTime: 60_000,
  });
}

export function useCreateSlaPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportSlaPolicies", "create"],
    mutationFn: (input: CreateSlaPolicyInput) => apiClient.post<SlaPolicy>("/support/sla-policies", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportSlaPolicies.all }),
  });
}

export function useUpdateSlaPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportSlaPolicies", "update"],
    mutationFn: ({ id, ...input }: UpdateSlaPolicyInput & { id: number }) =>
      apiClient.patch<SlaPolicy>(`/support/sla-policies/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportSlaPolicies.all }),
  });
}

export function useDeleteSlaPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportSlaPolicies", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/sla-policies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.supportSlaPolicies.all }),
  });
}
