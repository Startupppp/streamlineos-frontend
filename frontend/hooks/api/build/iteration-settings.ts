"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { IterationSettings, UpdateIterationSettingsInput } from "./iteration-settings-schema";

const iterationSettingsContract = lazyContract(() =>
  import("./iteration-settings-schema").then((m) => m.iterationSettingsSchema),
);

export function useIterationSettings(
  projectId: number,
  options?: Omit<UseQueryOptions<IterationSettings>, "queryKey" | "queryFn" | "enabled">,
) {
  const canView = useCan("build:view");
  return useQuery<IterationSettings>({
    queryKey: buildWorkQueryKeys.projects.iterationSettings(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<IterationSettings>(
        `/build/${projectId}/settings/iterations`,
        undefined,
        signal,
        iterationSettingsContract,
      ),
    staleTime: 60_000,
    ...options,
    enabled: canView && !!projectId && (options?.enabled ?? true),
  });
}

export function useUpdateIterationSettings(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<IterationSettings, Error, UpdateIterationSettingsInput>(
    "build:update",
    {
      mutationKey: ["projects", "settings", "iterations", "update", projectId],
      mutationFn: (data) =>
        apiClient.patch<IterationSettings>(
          `/build/${projectId}/settings/iterations`,
          data,
          undefined,
          iterationSettingsContract,
        ),
      onSuccess: (updatedSettings) => {
        queryClient.setQueryData<IterationSettings>(
          buildWorkQueryKeys.projects.iterationSettings(projectId),
          updatedSettings,
        );
        queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.iterationSettings(projectId),
        });
      },
    },
  );
}
