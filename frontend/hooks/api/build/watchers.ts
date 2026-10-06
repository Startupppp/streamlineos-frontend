"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, UseQueryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import type { buildWatcherMutationContract } from "@/hooks/api/watchers-schema";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { lazyContract } from "@/lib/api-envelope";
import type { TicketWatcher } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const watchersContract = lazyContract(() =>
  import("@/hooks/api/watchers-schema").then((m) => m.buildTicketWatchersContract),
);
const watcherMutationContract = lazyContract(() =>
  import("@/hooks/api/watchers-schema").then((m) => m.buildWatcherMutationContract),
);

type WatchersSnap = { previous: TicketWatcher[] | undefined };

type WatcherMutationResult = z.infer<typeof buildWatcherMutationContract>;

function reconcileWatcher(queryClient: QueryClient, ticketId: number, result: WatcherMutationResult) {
  queryClient.setQueryData<TicketWatcher[]>(buildWorkQueryKeys.projects.watchers(ticketId), (old) =>
    old?.map((watcher) =>
      watcher.userId === result.userId && watcher.user == null
        ? {
            ...watcher,
            user: { id: result.userId, name: result.name, firstName: null, lastName: null, email: null, image: result.image },
          }
        : watcher,
    ),
  );
}

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
  return useAuthorizedMutation<WatcherMutationResult | null, Error, { ticketId: number; watching: boolean; userId?: string }, WatchersSnap>("build:tickets:update", {
    mutationKey: ["projects", "watchers", "toggle"],
    mutationFn: async ({ ticketId, watching }): Promise<WatcherMutationResult | null> => {
      if (watching) {
        await apiClient.delete<void>(
          `/build/${projectId}/tickets/${ticketId}/watchers`,
          undefined,
          undefined,
          noContentLazy,
        );
        return null;
      }
      return apiClient.post<WatcherMutationResult>(
        `/build/${projectId}/tickets/${ticketId}/watchers`,
        {},
        undefined,
        watcherMutationContract,
      );
    },
    onMutate: async ({ ticketId, watching, userId }) => {
      const key = buildWorkQueryKeys.projects.watchers(ticketId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TicketWatcher[]>(key);
      if (userId) {
        queryClient.setQueryData<TicketWatcher[]>(key, (old) => {
          if (!old) return old;
          if (watching) return old.filter((w) => w.userId !== userId);
          const already = old.some((w) => w.userId === userId);
          if (already) return old;
          const temp: TicketWatcher = { id: -Date.now(), ticketId, userId, createdAt: new Date().toISOString(), user: null };
          return [...old, temp];
        });
      }
      return { previous };
    },
    onSuccess: (result, { ticketId }) => {
      if (result) reconcileWatcher(queryClient, ticketId, result);
    },
    onError: (_, { ticketId }, ctx) => {
      if (ctx?.previous !== undefined)
        queryClient.setQueryData(buildWorkQueryKeys.projects.watchers(ticketId), ctx.previous);
    },
  });
}

export function useAddWatcher(projectId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<WatcherMutationResult, Error, { ticketId: number; userId: string }, WatchersSnap>("build:tickets:update", {
    mutationKey: ["projects", "watchers", "add"],
    mutationFn: ({ ticketId, userId }) =>
      apiClient.post<WatcherMutationResult>(
        `/build/${projectId}/tickets/${ticketId}/watchers`,
        { userId },
        undefined,
        watcherMutationContract,
      ),
    onMutate: async ({ ticketId, userId }) => {
      const key = buildWorkQueryKeys.projects.watchers(ticketId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TicketWatcher[]>(key);
      queryClient.setQueryData<TicketWatcher[]>(key, (old) => {
        if (!old) return old;
        if (old.some((w) => w.userId === userId)) return old;
        const temp: TicketWatcher = { id: -Date.now(), ticketId, userId, createdAt: new Date().toISOString(), user: null };
        return [...old, temp];
      });
      return { previous };
    },
    onSuccess: (result, { ticketId }) => {
      if (result) reconcileWatcher(queryClient, ticketId, result);
    },
    onError: (_, { ticketId }, ctx) => {
      if (ctx?.previous !== undefined)
        queryClient.setQueryData(buildWorkQueryKeys.projects.watchers(ticketId), ctx.previous);
    },
  });
}
