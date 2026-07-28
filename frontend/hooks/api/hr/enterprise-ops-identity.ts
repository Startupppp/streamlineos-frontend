"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
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
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const BASE = "/hr/enterprise/ops/identity";

const identityKeys = {
  all: ["streamlineos", "hr-identity"] as const,
  provisioning: (p: Record<string, unknown>) => ["streamlineos", "hr-identity", "provisioning", p] as const,
  templates: ["streamlineos", "hr-identity", "templates"] as const,
  exitVerification: (userId: string) => ["streamlineos", "hr-identity", "exit-verification", userId] as const,
};

export function useAccessProvisioning(params: {
  page?: number;
  userId?: string;
  triggeredBy?: ProvisioningTrigger;
  status?: ProvisioningStatus;
} = {}) {
  return useQuery({
    queryKey: identityKeys.provisioning(params as Record<string, unknown>),
    queryFn: () => apiClient.get<PaginatedResult<AccessProvisioningRecord>>(`${BASE}/provisioning`, params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useProvisioningTemplates() {
  return useQuery({
    queryKey: identityKeys.templates,
    queryFn: () => apiClient.get<ProvisioningTemplate[]>(`${BASE}/templates`),
    staleTime: 60_000,
  });
}

export function useExitVerification(userId: string) {
  return useQuery({
    queryKey: identityKeys.exitVerification(userId),
    queryFn: () => apiClient.get<ExitVerificationResult>(`${BASE}/exit-verification`, { userId }),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useCreateProvisioning() {
  const qc = useQueryClient();
  return useMutation({
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

export function useUpdateProvisioning(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-identity", "provisioning-update", id],
    mutationFn: (body: Partial<{
      status: ProvisioningStatus;
      completedAt: string;
      verifiedBy: string | null;
    }>) => apiClient.patch<AccessProvisioningRecord>(`${BASE}/provisioning/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: identityKeys.all });
      toast.success("Provisioning updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useGenerateProvisioning() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-identity", "generate"],
    mutationFn: (body: { userId: string; triggeredBy: "joiner" | "mover" | "leaver" }) =>
      apiClient.post<{ generated: number }>(`${BASE}/provisioning/generate`, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: identityKeys.all });
      toast.success(`Generated ${data.generated} provisioning tasks`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateProvisioningTemplate() {
  const qc = useQueryClient();
  return useMutation({
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

export function useUpdateProvisioningTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-identity", "template-update", id],
    mutationFn: (body: Partial<{
      name: string;
      triggeredBy: "joiner" | "mover" | "leaver";
      systemsConfig: Array<{ systemName: string; action: ProvisioningAction }>;
    }>) => apiClient.patch<ProvisioningTemplate>(`${BASE}/templates/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: identityKeys.templates });
      toast.success("Template updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteProvisioningTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-identity", "template-delete"],
    mutationFn: (id: string) => apiClient.delete(`${BASE}/templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: identityKeys.templates });
      toast.success("Template deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
