"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type OrgSetupPayload = {
  industry: string;
  companyName?: string;
  companySize: string;
  country?: string;
  timezone?: string;
  phone?: string;
  enabledModules: string[];
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
    queryKey: queryKeys.orgSetup.session(),
    queryFn: () => apiClient.get<OrgSetupSession>("/org/setup/session"),
    staleTime: 30_000,
    retry: false,
    enabled,
  });
}

export function useCompleteOrgSetupMutation() {
  return useMutation({
    mutationKey: ["org", "setup", "complete"],
    mutationFn: (payload: OrgSetupPayload) =>
      apiClient.post<OrgSetupResponse>("/org/setup/complete", payload),
    retry: false,
  });
}

export function useSkipOrgSetupMutation() {
  return useMutation({
    mutationKey: ["org", "setup", "skip"],
    mutationFn: (payload: { reason?: string } = {}) =>
      apiClient.post<OrgSetupResponse>("/org/setup/skip", payload),
    retry: false,
  });
}
