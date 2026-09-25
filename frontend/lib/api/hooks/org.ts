"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { lazyContract } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { OrgSetupInvitee, OrgSetupStatus } from "@/lib/api/hooks/org-schema";

const orgSetupSessionContract = lazyContract(() =>
  import("@/lib/api/hooks/org-schema").then((m) => m.orgSetupSessionContract),
);
const orgSetupStatusContract = lazyContract(() =>
  import("@/lib/api/hooks/org-schema").then((m) => m.orgSetupStatusContract),
);
const orgSetupCompleteContract = lazyContract(() =>
  import("@/lib/api/hooks/org-schema").then((m) => m.orgSetupCompleteContract),
);
const orgSetupSkipContract = lazyContract(() =>
  import("@/lib/api/hooks/org-schema").then((m) => m.orgSetupSkipContract),
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

export type OrgSetupResponse = { success: boolean; orgId: string; autoLoginToken?: string };

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
      apiClient.post<OrgSetupResponse>("/org/setup/skip", payload, undefined, orgSetupSkipContract),
    retry: false,
  });
}
