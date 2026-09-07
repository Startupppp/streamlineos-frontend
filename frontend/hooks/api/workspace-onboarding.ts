"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const generateWorkspaceContract = lazyContract(() =>
  import("@/hooks/api/onboarding-flow-schema").then((m) => m.generateWorkspaceContract),
);

/**
 * DISAGREEMENT FIXED: `WorkspaceGenerationResult` previously used number fields
 * (`businessUnits: number`, etc.) but the backend `generateWorkspaceResponseSchema`
 * returns string arrays of created unit names. Updated to match backend.
 */
export type WorkspaceGenerationResult = {
  businessUnits: string[];
  branches: string[];
  departments: string[];
  teams: string[];
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
        undefined,
        generateWorkspaceContract,
      ),
  });
}
