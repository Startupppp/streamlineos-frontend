import { type QueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import type { Notification } from "@/types/notifications";
import type {
  NotificationInboxItem,
  UnifiedInboxItem,
  UnifiedInboxResponse,
} from "@/types/inbox";

export function isInfiniteData<T>(data: unknown): data is InfiniteData<T> {
  if (typeof data !== "object" || data === null) return false;
  return "pages" in data && "pageParams" in data;
}

export function isNotificationList(data: unknown): data is Notification[] {
  return Array.isArray(data);
}

export type NotifListSnapshot = [QueryKey, unknown];

export function snapshotAndPatchLists(
  queryClient: QueryClient,
  listKey: QueryKey,
  patcher: (n: Notification) => Notification,
): NotifListSnapshot[] {
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: listKey });
  for (const [key, data] of snapshots) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data)) {
      queryClient.setQueryData<InfiniteData<Notification[]>>(key, {
        ...data,
        pages: data.pages.map((page) => page.map(patcher)),
      });
    } else if (isNotificationList(data)) {
      queryClient.setQueryData<Notification[]>(key, data.map(patcher));
    }
  }
  return snapshots;
}

export function restoreListSnapshots(
  queryClient: QueryClient,
  snapshots: NotifListSnapshot[],
): void {
  for (const [key, data] of snapshots) {
    queryClient.setQueryData(key, data);
  }
}

export function restoreScopedReadState(
  queryClient: QueryClient,
  snapshots: NotifListSnapshot[],
  sourceModule: string,
): void {
  for (const [key, previous] of snapshots) {
    const unreadIds = new Set<number>();
    function collect(rows: (Notification | UnifiedInboxItem)[]) {
      for (const row of rows) {
        if ("kind" in row && row.kind !== "notification") continue;
        if (row.sourceModule === sourceModule && !row.isRead) unreadIds.add(row.id);
      }
    }
    if (isInfiniteData<Notification[] | UnifiedInboxResponse>(previous)) {
      for (const page of previous.pages) collect(Array.isArray(page) ? page : page.items);
    } else if (isNotificationList(previous)) {
      collect(previous);
    }
    if (unreadIds.size === 0) continue;
    function restore<T extends Notification | UnifiedInboxItem>(row: T): T {
      if ("kind" in row && row.kind !== "notification") return row;
      return row.sourceModule === sourceModule && unreadIds.has(row.id)
        ? { ...row, isRead: false }
        : row;
    }
    queryClient.setQueryData<unknown>(key, (current: unknown) => {
      if (isInfiniteData<Notification[] | UnifiedInboxResponse>(current)) {
        return {
          ...current,
          pages: current.pages.map((page) => Array.isArray(page)
            ? page.map(restore)
            : { ...page, items: page.items.map(restore) }),
        };
      }
      return isNotificationList(current) ? current.map(restore) : current;
    });
  }
}

export function snapshotAndRemoveFromLists(
  queryClient: QueryClient,
  listKey: QueryKey,
  id: number,
): NotifListSnapshot[] {
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: listKey });
  for (const [key, data] of snapshots) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data))
      queryClient.setQueryData<InfiniteData<Notification[]>>(key, {
        ...data,
        pages: data.pages.map((page) => page.filter((n) => n.id !== id)),
      });
    else if (isNotificationList(data))
      queryClient.setQueryData<Notification[]>(key, data.filter((n) => n.id !== id));
  }
  return snapshots;
}

export function snapshotAndRemoveFromListsMulti(
  queryClient: QueryClient,
  listKey: QueryKey,
  idSet: Set<number>,
): NotifListSnapshot[] {
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: listKey });
  for (const [key, data] of snapshots) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data))
      queryClient.setQueryData<InfiniteData<Notification[]>>(key, {
        ...data,
        pages: data.pages.map((page) => page.filter((n) => !idSet.has(n.id))),
      });
    else if (isNotificationList(data))
      queryClient.setQueryData<Notification[]>(key, data.filter((n) => !idSet.has(n.id)));
  }
  return snapshots;
}

export function findInLists(
  queryClient: QueryClient,
  listKey: QueryKey,
  predicate: (n: Notification) => boolean,
): Notification | undefined {
  const entries = queryClient.getQueriesData<unknown>({ queryKey: listKey });
  for (const [, data] of entries) {
    if (data === undefined) continue;
    if (isInfiniteData<Notification[]>(data)) {
      for (const page of data.pages) {
        const found = page.find(predicate);
        if (found) return found;
      }
    } else if (isNotificationList(data)) {
      const found = data.find(predicate);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * `/me/inbox/unified` renders the same notifications as `/notifications`, so an
 * action taken from one has to move on both. Patching only the notification
 * lists made archive optimistic on one route and a wait-for-refetch on the
 * other, for the identical click.
 *
 * Only `kind: "notification"` items are touched — mail, broadcasts and build
 * approvals share the feed but not these mutations.
 */
function patchUnifiedPages(
  queryClient: QueryClient,
  inboxKey: QueryKey,
  transform: (items: UnifiedInboxItem[]) => UnifiedInboxItem[],
): NotifListSnapshot[] {
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: inboxKey });
  for (const [key, data] of snapshots) {
    if (!isInfiniteData<UnifiedInboxResponse>(data)) continue;
    queryClient.setQueryData<InfiniteData<UnifiedInboxResponse>>(key, {
      ...data,
      pages: data.pages.map((page) => ({ ...page, items: transform(page.items) })),
    });
  }
  return snapshots;
}

export function snapshotAndPatchUnified(
  queryClient: QueryClient,
  inboxKey: QueryKey,
  patcher: (item: NotificationInboxItem) => UnifiedInboxItem,
): NotifListSnapshot[] {
  return patchUnifiedPages(queryClient, inboxKey, (items) =>
    items.map((item) => (item.kind === "notification" ? patcher(item) : item)),
  );
}

export function snapshotAndRemoveFromUnified(
  queryClient: QueryClient,
  inboxKey: QueryKey,
  ids: ReadonlySet<number>,
): NotifListSnapshot[] {
  return patchUnifiedPages(queryClient, inboxKey, (items) =>
    items.filter((item) => item.kind !== "notification" || !ids.has(item.id)),
  );
}
