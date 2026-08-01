"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useGenerateWorkspace() {
  return useMutation<{ success: boolean }, Error, { industry: string; enabledModules?: string[] }>({
    mutationKey: ["generate", "workspace"],
    mutationFn: (data) =>
      apiClient.post<{ success: boolean }>("/workspace-onboarding/generate", data),
  });
}
