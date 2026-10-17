"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { PolicyQaResult } from "@/hooks/api/hr/ai-policy-qa-schema";

const policyQaContract = lazyContract(() =>
  import("@/hooks/api/hr/ai-policy-qa-schema").then((m) => m.policyQaContract),
);

export function useAskHrPolicy() {
  return useAuthorizedMutation("hr:policies:view", {
    mutationKey: ["ai", "hr", "policy-qa"],
    mutationFn: ({ question }: { question: string }) =>
      apiClient.post<PolicyQaResult>("/ai/hr/policy-qa", { question }, undefined, policyQaContract),
  });
}
