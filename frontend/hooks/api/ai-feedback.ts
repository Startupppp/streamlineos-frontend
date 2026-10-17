"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const aiFeedbackCreateContract = lazyContract(() =>
  import("@/hooks/api/ai-feedback-schema").then((m) => m.aiFeedbackCreateContract),
);

export interface CreateAiFeedbackInput {
  feature: string;
  rating: "UP" | "DOWN";
  correlationId?: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export function useCreateAiFeedback() {
  return useAuthorizedMutation("ai:feedback:create", {
    mutationKey: ["ai", "feedback", "create"],
    mutationFn: (input: CreateAiFeedbackInput) =>
      apiClient.post<{ success: true }>("/ai/feedback", input, undefined, aiFeedbackCreateContract),
  });
}
