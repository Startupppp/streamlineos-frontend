"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { TicketWatcher } from "@/types/projects";

export function useWatchers(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<TicketWatcher[]>, "queryKey" | "queryFn" | "enabled">
) {
  return useQuery<TicketWatcher[]>({
    queryKey: queryKeys.projects.watchers(ticketId),
    queryFn: () =>
      apiClient.get<TicketWatcher[]>(
        `/build/${projectId}/tickets/${ticketId}/watchers`
      ),
    enabled: !!ticketId && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useToggleWatch(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "watchers", "toggle"],
    mutationFn: ({
      ticketId,
      watching,
    }: {
      ticketId: number;
      watching: boolean;
    }) => {
      if (watching) {
        return apiClient.delete<{ success: boolean }>(
          `/build/${projectId}/tickets/${ticketId}/watchers`
        );
      }
      return apiClient.post<{ success: boolean }>(
        `/build/${projectId}/tickets/${ticketId}/watchers`,
        {}
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.watchers(variables.ticketId),
      });
    },
  });
}

export function useAddWatcher(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "watchers", "add"],
    mutationFn: ({
      ticketId,
      userId,
    }: {
      ticketId: number;
      userId: string;
    }) =>
      apiClient.post<{ success: boolean }>(
        `/build/${projectId}/tickets/${ticketId}/watchers`,
        { userId }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.watchers(variables.ticketId),
      });
    },
  });
}
