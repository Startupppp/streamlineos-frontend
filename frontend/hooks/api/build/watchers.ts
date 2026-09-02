"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { TicketWatcher } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useWatchers(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<TicketWatcher[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<TicketWatcher[]>({
    queryKey: queryKeys.projects.watchers(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketWatcher[]>(
        `/build/${projectId}/tickets/${ticketId}/watchers`
      , undefined, signal),
    enabled: canView && !!ticketId && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useToggleWatch(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
  return useAuthorizedMutation("build:tickets:update", {
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
