"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignOrgSettings, SignWatermarkPolicy } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const signSettingsSingleContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signSettingsSingleContract),
);

const signWatermarkPolicyListContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signWatermarkPolicyListContract),
);

const signWatermarkPolicyMutationContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signWatermarkPolicyMutationContract),
);

const signSuccessContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signSuccessContract),
);

export function useSignSettings() {
  return useGatedQuery("sign:admin:manage", {
    queryKey: growthAndSignQueryKeys.signAdmin.settings(),
    queryFn: ({ signal }) => apiClient.get<SignOrgSettings>("/sign/admin/settings", undefined, signal, signSettingsSingleContract),
    staleTime: 60_000,
  });
}

export function useUpdateSignSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:admin:manage", {
    mutationKey: ["signAdmin", "settings", "update"],
    mutationFn: (input: Partial<SignOrgSettings>) => apiClient.patch<SignOrgSettings>("/sign/admin/settings", input, undefined, signSettingsSingleContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signAdmin.settings() }),
  });
}

export function useSignWatermarkPolicies() {
  return useGatedQuery("sign:admin:manage", {
    queryKey: growthAndSignQueryKeys.signAdmin.watermarkPolicies(),
    queryFn: ({ signal }) => apiClient.get<SignWatermarkPolicy[]>("/sign/admin/watermark-policies", undefined, signal, signWatermarkPolicyListContract),
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
  return useAuthorizedMutation("sign:admin:manage", {
    mutationKey: ["signAdmin", "watermark", "create"],
    mutationFn: (input: WatermarkPolicyInput) => apiClient.post<SignWatermarkPolicy>("/sign/admin/watermark-policies", input, undefined, signWatermarkPolicyMutationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signAdmin.watermarkPolicies() }),
  });
}

export function useUpdateWatermarkPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:admin:manage", {
    mutationKey: ["signAdmin", "watermark", "update"],
    mutationFn: ({ id, input }: { id: number; input: Partial<WatermarkPolicyInput> }) =>
      apiClient.patch<SignWatermarkPolicy>(`/sign/admin/watermark-policies/${id}`, input, undefined, signWatermarkPolicyMutationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signAdmin.watermarkPolicies() }),
  });
}

export function useDeleteWatermarkPolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:admin:manage", {
    mutationKey: ["signAdmin", "watermark", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: true }>(`/sign/admin/watermark-policies/${id}`, undefined, undefined, signSuccessContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signAdmin.watermarkPolicies() }),
  });
}
