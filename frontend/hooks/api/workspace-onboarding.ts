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

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationKey: ["complete", "onboarding"],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/workspace-onboarding/complete", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
    },
  });
}
