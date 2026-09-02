import { type QueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import type { Notification } from "@/types/notifications";

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
