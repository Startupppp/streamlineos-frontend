"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type WorkspaceGenerationResult = {
  businessUnits: number;
  branches: number;
  departments: number;
  teams: number;
};

export function useGenerateWorkspace() {
  return useMutation<
    WorkspaceGenerationResult,
    Error,
    { industry: string; enabledModules?: string[] }
  >({
    mutationKey: ["generate", "workspace"],
    mutationFn: (data) =>
      apiClient.post<WorkspaceGenerationResult>(
        "/workspace-onboarding/generate",
        data,
      ),
  });
}
