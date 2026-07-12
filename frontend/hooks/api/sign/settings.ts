"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignOrgSettings, SignWatermarkPolicy } from "@/types/sign";

export function useSignSettings() {
  return useQuery({
    queryKey: queryKeys.signAdmin.settings(),
    queryFn: () => apiClient.get<SignOrgSettings>("/sign/admin/settings"),
    staleTime: 60_000,
  });
}

export function useUpdateSignSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signAdmin", "settings", "update"],
    mutationFn: (input: Partial<SignOrgSettings>) => apiClient.patch<SignOrgSettings>("/sign/admin/settings", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signAdmin.settings() }),
  });
}

export function useSignWatermarkPolicies() {
  return useQuery({
    queryKey: queryKeys.signAdmin.watermarkPolicies(),
    queryFn: () => apiClient.get<SignWatermarkPolicy[]>("/sign/admin/watermark-policies"),
    staleTime: 60_000,
  });
}

export interface WatermarkPolicyInput {
  scopeType: "tenant" | "template" | "envelope";
  scopeId?: number;
  appliesStates: string[];
  text?: string;
  opacity?: number;
  angle?: number;
  color?: string;
  fontSize?: number;
  showOnFinalPdf?: boolean;
  previewOnly?: boolean;
  enabled?: boolean;
}

export function useCreateWatermarkPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signAdmin", "watermark", "create"],
    mutationFn: (input: WatermarkPolicyInput) => apiClient.post<SignWatermarkPolicy>("/sign/admin/watermark-policies", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signAdmin.watermarkPolicies() }),
  });
}

export function useUpdateWatermarkPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signAdmin", "watermark", "update"],
    mutationFn: ({ id, input }: { id: number; input: Partial<WatermarkPolicyInput> }) =>
      apiClient.patch<SignWatermarkPolicy>(`/sign/admin/watermark-policies/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signAdmin.watermarkPolicies() }),
  });
}

export function useDeleteWatermarkPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signAdmin", "watermark", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: true }>(`/sign/admin/watermark-policies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signAdmin.watermarkPolicies() }),
  });
}

export function useRunSignReminderSweep() {
  return useMutation({
    mutationKey: ["signAdmin", "run-reminder-sweep"],
    mutationFn: () => apiClient.post<{ remindedCount: number }>("/sign/admin/run-reminder-sweep"),
  });
}

export function useRunSignExpirationSweep() {
  return useMutation({
    mutationKey: ["signAdmin", "run-expiration-sweep"],
    mutationFn: () => apiClient.post<{ expiredCount: number }>("/sign/admin/run-expiration-sweep"),
  });
}
