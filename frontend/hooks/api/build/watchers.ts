"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { lazyContract } from "@/lib/api-envelope";
import type { TicketWatcher } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

/** Deferred: `hooks/api/index.ts` re-exports this, and the schema pulls Zod. */
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const watchersContract = lazyContract(() =>
  import("@/hooks/api/watchers-schema").then((m) => m.buildTicketWatchersContract),
);
const watcherMutationContract = lazyContract(() =>
  import("@/hooks/api/watchers-schema").then((m) => m.buildWatcherMutationContract),
);

export function useWatchers(
  projectId: number,
  ticketId: number,
  options?: Omit<UseQueryOptions<TicketWatcher[]>, "queryKey" | "queryFn" | "enabled">
) {
  const canView = useCan("build:tickets:view");
  return useQuery<TicketWatcher[]>({
    queryKey: buildWorkQueryKeys.projects.watchers(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketWatcher[]>(
        `/build/${projectId}/tickets/${ticketId}/watchers`,
        undefined,
        signal,
        watchersContract,
      ),
    enabled: canView && !!ticketId && !!projectId,
    staleTime: 30_000,
    ...options,
  });
}

export function useToggleWatch(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "watchers", "toggle"],
    mutationFn: async ({
      ticketId,
      watching,
    }: {
      ticketId: number;
      watching: boolean;
    }): Promise<void> => {
      if (watching) {
        await apiClient.delete<void>(
          `/build/${projectId}/tickets/${ticketId}/watchers`,
          undefined,
          undefined,
          noContentLazy,
        );
        return;
      }
      await apiClient.post(
        `/build/${projectId}/tickets/${ticketId}/watchers`,
        {},
        undefined,
        watcherMutationContract,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.watchers(variables.ticketId),
      });
    },
  });
}

export function useAddWatcher(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
    mutationKey: ["projects", "watchers", "add"],
    mutationFn: async ({
      ticketId,
      userId,
    }: {
      ticketId: number;
      userId: string;
    }) => {
      await apiClient.post(
        `/build/${projectId}/tickets/${ticketId}/watchers`,
        { userId },
        undefined,
        watcherMutationContract,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.watchers(variables.ticketId),
      });
    },
  });
}
