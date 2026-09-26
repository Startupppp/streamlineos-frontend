"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ProjectRetentionSettings,
  UpdateRetentionPolicyInput,
  SetLegalHoldInput,
} from "@/features/build/settings/project-settings-retention-schema";

const retentionSettingsContract = lazyContract(() =>
  import("@/features/build/settings/project-settings-retention-schema").then(
    (m) => m.projectRetentionSettingsContract,
  ),
);

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export type { ProjectRetentionSettings };

export function useProjectRetentionSettings(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<ProjectRetentionSettings>({
    queryKey: buildWorkQueryKeys.projects.retentionSettings(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectRetentionSettings>(
        `/build/${projectId}/settings/retention`,
        undefined,
        signal,
        retentionSettingsContract,
      ),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useUpdateRetentionPolicy(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:update", {
    mutationKey: ["projects", projectId, "retention-settings", "update"],
    mutationFn: (data: UpdateRetentionPolicyInput) =>
      apiClient.patch<ProjectRetentionSettings>(
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
