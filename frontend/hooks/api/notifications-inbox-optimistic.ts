"use client";

import { useMutation } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { Notification, UnreadCount } from "@/types/notifications";
import { useNotificationInboxInvalidation } from "./notifications-shared";
import {
  type NotifListSnapshot,
  findInLists,
  isInfiniteData,
  isNotificationList,
  restoreListSnapshots,
  snapshotAndPatchLists,
} from "./notifications-inbox-cache";

/**
 * The optimistic transaction every notification write runs, separated from the
 * hooks that declare which endpoint they call and what the row becomes.
 * `notifications-inbox-cache.ts` below this owns the per-cache-shape primitives
 * (flat list, InfiniteData pages, the unified inbox feed); this owns the
 * protocol over them — cancel, snapshot, unread accounting, rollback — which is
 * where the duplication was: the "how many of these ids are unread" scan was
 * written out three times and the rollback block eleven.
 */

export type NotificationAck = { success: boolean };

export type NotifMutationContext = {
  previousLists: NotifListSnapshot[];
  previousCount: UnreadCount | undefined;
};

type InboxPatchScope = {
  listKey: QueryKey;
  unreadKey: QueryKey;
  previousCount: UnreadCount | undefined;
};

export async function beginInboxPatch(
  queryClient: QueryClient,
): Promise<InboxPatchScope> {
  const listKey = platformCoreQueryKeys.notifications.lists();
  const unreadKey = platformCoreQueryKeys.notifications.unreadCount();
  await queryClient.cancelQueries({ queryKey: listKey });
  await queryClient.cancelQueries({ queryKey: unreadKey });
  return {
    listKey,
    unreadKey,
    previousCount: queryClient.getQueryData<UnreadCount>(unreadKey),
  };
}

function collectUnread(
  rows: Notification[],
  ids: ReadonlySet<number>,
  into: Set<number>,
): void {
  for (const row of rows)
    if (ids.has(row.id) && !row.isRead) into.add(row.id);
}

/**
 * Counts distinct ids, not occurrences: the same notification appears in the
 * flat list and in every InfiniteData page cached for a different filter, so
 * summing per cache would decrement the badge once per cached view.
 */
export function countUnreadAmong(
  queryClient: QueryClient,
  listKey: QueryKey,
  ids: ReadonlySet<number>,
): number {
  const unread = new Set<number>();
  for (const [, data] of queryClient.getQueriesData<unknown>({ queryKey: listKey })) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data)) {
      for (const page of data.pages) collectUnread(page, ids, unread);
    } else if (isNotificationList(data)) {
      collectUnread(data, ids, unread);
    }
  }
  return unread.size;
}

export function isUnreadNow(
  queryClient: QueryClient,
  listKey: QueryKey,
  id: number,
): boolean {
  const found = findInLists(queryClient, listKey, (row) => row.id === id);
  return found !== undefined && !found.isRead;
}

export function applyUnreadDelta(
  queryClient: QueryClient,
  unreadKey: QueryKey,
  cleared: number,
): void {
  if (cleared <= 0) return;
  queryClient.setQueryData<UnreadCount>(unreadKey, (old) =>
    old ? { count: Math.max(0, old.count - cleared) } : old,
  );
}

export function restoreInboxSnapshot(
  queryClient: QueryClient,
  context: NotifMutationContext | undefined,
): void {
  if (!context) return;
  restoreListSnapshots(queryClient, context.previousLists);
  if (context.previousCount !== undefined)
    queryClient.setQueryData(
      platformCoreQueryKeys.notifications.unreadCount(),
      context.previousCount,
    );
}

type NotificationRowPatchSpec<TVars> = {
  mutationKey: string[];
  request: (vars: TVars) => Promise<NotificationAck>;
  patch: (vars: TVars) => (row: Notification) => Notification;
};

/**
 * Pin, unpin, unarchive and snooze set one field on one row and none of them
 * changes read state, so none of them touches the unread count or the unified
 * feed — the whole difference between them is the endpoint and the field.
 */
export function useNotificationRowPatch<TVars>(
  spec: NotificationRowPatchSpec<TVars>,
) {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, TVars, NotifMutationContext>({
    mutationKey: spec.mutationKey,
    mutationFn: spec.request,
    onMutate: async (vars) => {
      const listKey = platformCoreQueryKeys.notifications.lists();
      await queryClient.cancelQueries({ queryKey: listKey });
      return {
        previousLists: snapshotAndPatchLists(queryClient, listKey, spec.patch(vars)),
        previousCount: undefined,
      };
    },
    onError: (_err, _vars, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
}
