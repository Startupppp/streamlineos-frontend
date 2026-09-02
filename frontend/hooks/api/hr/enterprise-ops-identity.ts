"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export type ProvisioningAction = "grant" | "revoke" | "review";
export type ProvisioningStatus = "pending" | "completed" | "verified" | "failed";
export type ProvisioningTrigger = "joiner" | "mover" | "leaver" | "manual";

export interface AccessProvisioningRecord {
  id: string;
  orgId: string;
  userId: string;
  systemName: string;
  action: ProvisioningAction;
  status: ProvisioningStatus;
  triggeredBy: ProvisioningTrigger;
  requestedAt: string;
  completedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisioningTemplate {
  id: string;
  orgId: string;
  name: string;
  triggeredBy: "joiner" | "mover" | "leaver";
  systemsConfig: Array<{ systemName: string; action: ProvisioningAction }>;
  createdAt: string;
  updatedAt: string;
}

export interface ExitVerificationResult {
  userId: string;
  hasUnverifiedRevokes: boolean;
  unverified: AccessProvisioningRecord[];
  total: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const BASE = "/hr/enterprise/ops/identity";

const identityKeys = {
  all: ["streamlineos", "hr-identity"] as const,
  provisioning: (p: Record<string, unknown>) => ["streamlineos", "hr-identity", "provisioning", p] as const,
  templates: ["streamlineos", "hr-identity", "templates"] as const,
  exitVerification: (userId: string) => ["streamlineos", "hr-identity", "exit-verification", userId] as const,
};

export function useAccessProvisioning(params: {
  cursor?: string;
  userId?: string;
  triggeredBy?: ProvisioningTrigger;
  status?: ProvisioningStatus;
} = {}) {
  return useQuery({
    queryKey: identityKeys.provisioning(params as Record<string, unknown>),
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<AccessProvisioningRecord>>(`${BASE}/provisioning`, params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useProvisioningTemplates() {
  return useQuery({
    queryKey: identityKeys.templates,
    queryFn: ({ signal }) => apiClient.get<ProvisioningTemplate[]>(`${BASE}/templates`, undefined, signal),
    staleTime: 60_000,
  });
}

export function useExitVerification(userId: string) {
  return useQuery({
    queryKey: identityKeys.exitVerification(userId),
    queryFn: ({ signal }) => apiClient.get<ExitVerificationResult>(`${BASE}/exit-verification`, { userId }, signal),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useCreateProvisioning() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:identity:manage", {
    mutationKey: ["hr-identity", "provisioning-create"],
    mutationFn: (body: {
      userId: string;
      systemName: string;
      action: ProvisioningAction;
      triggeredBy: ProvisioningTrigger;
    }) => apiClient.post<AccessProvisioningRecord>(`${BASE}/provisioning`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: identityKeys.all });
      toast.success("Provisioning record created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateProvisioningTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:identity:manage", {
    mutationKey: ["hr-identity", "template-create"],
    mutationFn: (body: {
      name: string;
      triggeredBy: "joiner" | "mover" | "leaver";
      systemsConfig: Array<{ systemName: string; action: ProvisioningAction }>;
    }) => apiClient.post<ProvisioningTemplate>(`${BASE}/templates`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: identityKeys.templates });
      toast.success("Template created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteProvisioningTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:identity:manage", {
    mutationKey: ["hr-identity", "template-delete"],
    mutationFn: (id: string) => apiClient.delete(`${BASE}/templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: identityKeys.templates });
      toast.success("Template deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
