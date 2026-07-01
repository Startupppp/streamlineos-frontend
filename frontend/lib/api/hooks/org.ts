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
};

export type OrgSetupResponse = { orgId?: string; autoLoginToken?: string };

export function useOrgSetupMutation() {
  return useMutation({
    mutationKey: ["org", "setup"],
    mutationFn: (payload: OrgSetupPayload) =>
      apiClient.patch<OrgSetupResponse>("/org/setup", payload),
    retry: false,
  });
}

export type InvitePayload = {
  invitees: { email: string; role: string }[];
};

export function useInvitationsMutation() {
  return useMutation({
    mutationKey: ["org", "invite"],
    mutationFn: (payload: InvitePayload) =>
      apiClient.post<void>("/org/invite", payload),
    retry: false,
  });
}
