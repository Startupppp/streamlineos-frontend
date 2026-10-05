"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { ProjectsRetentionSettingsGetSettingsResponse } from "@/contracts/build-contracts.generated";
import type {
  UpdateRetentionPolicyInput,
  SetLegalHoldInput,
} from "@/features/build/settings/project-settings-retention-schema";

const retentionSettingsContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then(
    (m) => m.projectsRetentionSettingsGetSettingsResponseSchema,
  ),
);

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export type { ProjectsRetentionSettingsGetSettingsResponse };

export function useProjectRetentionSettings(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<ProjectsRetentionSettingsGetSettingsResponse>({
    queryKey: buildWorkQueryKeys.projects.retentionSettings(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectsRetentionSettingsGetSettingsResponse>(
        `/build/${projectId}/settings/retention`,
        undefined,
        signal,
        retentionSettingsContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
    throwOnError: false,
    retry: false,
  });
}

export function useUpdateRetentionPolicy(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:update", {
    mutationKey: ["projects", projectId, "retention-settings", "update"],
    mutationFn: (data: UpdateRetentionPolicyInput) =>
      apiClient.patch<ProjectsRetentionSettingsGetSettingsResponse>(
        `/build/${projectId}/settings/retention`,
        data,
        undefined,
        retentionSettingsContract,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.retentionSettings(projectId),
        updated,
      );
    },
  });
}

export function useSetLegalHold(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:update", {
    mutationKey: ["projects", projectId, "retention-settings", "legal-hold"],
    mutationFn: (data: SetLegalHoldInput) =>
      apiClient.patch<void>(
        `/build/${projectId}/settings/retention/legal-hold`,
        data,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.retentionSettings(projectId),
      });
    },
  });
}
