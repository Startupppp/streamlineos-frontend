"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type WorkspaceGenerationResult = {
  businessUnits: number;
  branches: number;
  departments: number;
  teams: number;
};

export function useGenerateWorkspace() {
  return useAuthorizedMutation<
    WorkspaceGenerationResult,
    Error,
    { industry: string; enabledModules?: string[] }
  >("settings:organization:manage", {
    mutationKey: ["generate", "workspace"],
    mutationFn: (data) =>
      apiClient.post<WorkspaceGenerationResult>(
        "/workspace-onboarding/generate",
        data,
      ),
  });
}
