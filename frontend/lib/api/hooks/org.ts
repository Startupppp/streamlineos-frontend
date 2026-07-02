"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type OrgSetupPayload = {
  industry: string;
  companyName?: string;
  companySize: string;
  country?: string;
  timezone?: string;
  enabledModules: string[];
};

export type OrgSetupResponse = { success: boolean; orgId: string; autoLoginToken?: string };

export function useOrgSetupMutation() {
  return useMutation({
    mutationKey: ["org", "setup"],
    mutationFn: (payload: OrgSetupPayload) =>
      apiClient.patch<OrgSetupResponse>("/org/setup", payload),
    retry: false,
  });
}
