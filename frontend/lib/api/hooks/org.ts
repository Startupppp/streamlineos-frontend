"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type OrgSetupPayload = {
  goals?: string[];
  industry: string;
  companyName?: string;
  companySize: string;
  country?: string;
  timezone?: string;
  enabledModules: string[];
  invitees?: { email: string; role: string }[];
};

export type OrgSetupResponse = { orgId?: string };

export function useOrgSetupMutation() {
  return useMutation({
    mutationFn: (payload: OrgSetupPayload) =>
      apiClient.patch<OrgSetupResponse>("/org/setup", payload),
    retry: false,
  });
}
