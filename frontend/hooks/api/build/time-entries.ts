"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { TimeEntry, LogTimeInput } from "@/types/projects";

export function useLogTime(options?: Parameters<typeof useMutation>[0]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "time-entries", "log"],
    mutationFn: ({ projectId, ticketId, ...data }: LogTimeInput) =>
      apiClient.post<TimeEntry>(
        `/build/${projectId}/tickets/${ticketId}/time-entries`,
        data
      ),
    onSuccess: (_: unknown, variables: LogTimeInput) => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.projects.all, "timeEntries"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.ticket(variables.ticketId),
      });
    },
    ...options,
  });
}
