"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useGenerateWorkspace() {
  return useMutation<{ success: boolean }, Error, { industry: string; enabledModules?: string[] }>({
    mutationKey: ["generate", "workspace"],
    mutationFn: (data) =>
      apiClient.post<{ success: boolean }>("/workspace-onboarding/generate", data),
  });
}
