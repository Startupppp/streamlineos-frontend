"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { OrgSetupInvitee, OrgSetupStatus } from "@/hooks/api/org-setup-schema";

const orgSetupSessionContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupSessionContract),
);
const orgSetupStatusContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupStatusContract),
);
const orgSetupCompleteContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupCompleteContract),
);
const orgSetupSkipContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupSkipContract),
);

export type OrgSetupPayload = {
  industry: string;
  companyName?: string;
  /** HRMS-E2E-025. The owner's own name, collected on Basics. Optional, mirroring the backend. */
  fullName?: string;
  companySize: string;
  country?: string;
  timezone?: string;
  phone?: string;
  enabledModules: string[];
  invitees?: OrgSetupInvitee[];
};

export type OrgSetupResponse = { success: true; orgId: string; autoLoginToken?: string; destination: string };
export type OrgSetupSkipResponse = { success: true; orgId: string; autoLoginToken?: string };

export type OrgSetupSession = {
  id: number;
  type: string;
  status: "not_started" | "in_progress" | "completed" | "skipped" | "abandoned";
  currentStep: string | null;
  completedSteps: string[];
  skippedSteps: string[];
  data: Record<string, unknown>;
};

export function useOrgSetupSessionQuery(enabled = true) {
  return useQuery({
    queryKey: platformCoreQueryKeys.orgSetup.session(),
    queryFn: ({ signal }) => apiClient.get<OrgSetupSession>("/org/setup/session", undefined, signal, orgSetupSessionContract),
    staleTime: 30_000,
    retry: false,
    enabled,
  });
}

export function useOrgSetupStatusQuery(
  options?: Omit<UseQueryOptions<OrgSetupStatus, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: platformCoreQueryKeys.orgSetup.status(),
    queryFn: ({ signal }) =>
      apiClient.get<OrgSetupStatus>(
        "/org/setup/status",
        undefined,
        signal,
        orgSetupStatusContract,
      ),
    staleTime: 0,
    retry: false,
    ...options,
  });
}

export function useCompleteOrgSetupMutation() {
  return useMutation({
    mutationKey: ["org", "setup", "complete"],
    mutationFn: (payload: OrgSetupPayload) =>
      apiClient.post<OrgSetupResponse>("/org/setup/complete", payload, { timeoutMs: 5 * 60_000 }, orgSetupCompleteContract),
    retry: false,
  });
}

export function useSkipOrgSetupMutation() {
  return useMutation({
    mutationKey: ["org", "setup", "skip"],
    mutationFn: (payload: { reason?: string } = {}) =>
      apiClient.post<OrgSetupSkipResponse>("/org/setup/skip", payload, undefined, orgSetupSkipContract),
    retry: false,
  });
}

const orgSetupDraftSaveContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupDraftSaveContract),
);
const orgSetupDraftContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupDraftContract),
);
const orgSetupPreviewContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupPreviewContract),
);
const orgSetupActivateContract = lazyContract(() =>
  import("@/hooks/api/org-setup-schema").then((m) => m.orgSetupActivateContract),
);

export type OrgSetupDraftSavePayload = {
  revision: number;
  stepData: Record<string, unknown>;
  expiresAt: string;
};

export type OrgSetupPreviewPayload = {
  modules: string[];
  targetOrgId?: string;
};

export type OrgSetupActivatePayload = {
  idempotencyKey: string;
  modules: string[];
};

export function useOrgSetupDraftSaveMutation() {
  return useMutation({
    mutationKey: ["org", "setup", "draft", "save"],
    mutationFn: (payload: OrgSetupDraftSavePayload) =>
      apiClient.put("/org/setup/draft", payload, undefined, orgSetupDraftSaveContract),
    retry: false,
  });
}

export function useOrgSetupDraftQuery(enabled = true) {
  return useQuery({
    queryKey: platformCoreQueryKeys.orgSetup.draft(),
    queryFn: ({ signal }) =>
      apiClient.get("/org/setup/draft", undefined, signal, orgSetupDraftContract),
    staleTime: 60_000,
    retry: false,
    enabled,
  });
}

export function useOrgSetupPreviewMutation() {
  return useMutation({
    mutationKey: ["org", "setup", "preview"],
    mutationFn: (payload: OrgSetupPreviewPayload) =>
      apiClient.post("/org/setup/selection/preview", payload, undefined, orgSetupPreviewContract),
    retry: false,
  });
}

export function useOrgSetupActivateMutation() {
  return useMutation({
    mutationKey: ["org", "setup", "activate"],
    mutationFn: (payload: OrgSetupActivatePayload) =>
      apiClient.post("/org/setup/activate", payload, { timeoutMs: 5 * 60_000 }, orgSetupActivateContract),
    retry: false,
  });
}
