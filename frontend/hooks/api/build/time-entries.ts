"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { TimeEntry, LogTimeInput } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { invalidateBuildViews } from "./ticket-cache";


const timeEntryRowLazy = lazyContract(() =>
  import("@/hooks/api/build/time-entry-schema").then((m) => m.timeEntryRowContract),
);

export function useLogTime(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:timesheets:create", {
    ...options,
    mutationKey: ["projects", "time-entries", "log"],
    mutationFn: ({ projectId, ticketId, ...data }: LogTimeInput) =>
      apiClient.post(
        `/build/${projectId}/tickets/${ticketId}/time-entries`,
        data,
        undefined,
        timeEntryRowLazy,
      ),
    onSuccess: (_: unknown, variables: LogTimeInput) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.timeEntries(),
      });
      invalidateBuildViews(queryClient, variables.projectId, [variables.ticketId]);
    },
  });
}
