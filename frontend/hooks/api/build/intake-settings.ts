"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { IntakeSettings } from "@/hooks/api/build/intake-settings-schema";

const intakeSettingsContract = lazyContract(() =>
  import("@/hooks/api/build/intake-settings-schema").then(
    (m) => m.intakeSettingsContract,
  ),
);

export function useIntakeSettings(projectId: number) {
  return useGatedQuery<IntakeSettings>("build:workspace:manage", {
    queryKey: buildWorkQueryKeys.projects.intakeSettings(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<IntakeSettings>(
        `/build/${projectId}/settings/intake`,
        undefined,
        signal,
        intakeSettingsContract,
      ),
    enabled: !!projectId,
    staleTime: 60_000,
    retry: false,
    ...INLINE_READ_ERROR,
  });
}

export function usePublishIntake(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", projectId, "intake-settings", "publish"],
    mutationFn: () =>
      apiClient.post<IntakeSettings>(
        `/build/${projectId}/settings/intake/publish`,
        {},
        undefined,
        intakeSettingsContract,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.intakeSettings(projectId),
        updated,
      );
    },
  });
}

export function useUnpublishIntake(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:workspace:manage", {
    mutationKey: ["projects", projectId, "intake-settings", "unpublish"],
    mutationFn: () =>
      apiClient.post<IntakeSettings>(
        `/build/${projectId}/settings/intake/unpublish`,
        {},
        undefined,
        intakeSettingsContract,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.intakeSettings(projectId),
        updated,
      );
    },
  });
}
