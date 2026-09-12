"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useNotificationInboxInvalidation } from "./notifications-shared";
import {
  snapshotAndPatchLists,
  snapshotAndRemoveFromLists,
  snapshotAndRemoveFromListsMulti,
  snapshotAndRemoveFromUnified,
} from "./notifications-inbox-cache";
import {
  type NotifMutationContext,
  type NotificationAck,
  applyUnreadDelta,
  beginInboxPatch,
  countUnreadAmong,
  isUnreadNow,
  restoreInboxSnapshot,
  useNotificationRowPatch,
} from "./notifications-inbox-optimistic";

const notificationAckLazy = lazyContract(() => import("@/hooks/api/notifications-schema").then((m) => m.notificationAckContract));

export const useArchiveNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "archive"],
    mutationFn: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/archive`, undefined, undefined, notificationAckLazy),
    onMutate: async (id) => {
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = isUnreadNow(queryClient, listKey, id) ? 1 : 0;
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          n.id === id ? { ...n, archivedAt: new Date().toISOString() } : n,
        ),
        ...snapshotAndRemoveFromUnified(queryClient, platformCoreQueryKeys.inbox.all, new Set([id])),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useDeleteNotification = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number, NotifMutationContext>({
    mutationKey: ["notifications", "delete"],
    mutationFn: (id) => apiClient.delete<NotificationAck>(`/notifications/${id}`, undefined, undefined, notificationAckLazy),
    onMutate: async (id) => {
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = isUnreadNow(queryClient, listKey, id) ? 1 : 0;
      const previousLists = [
        ...snapshotAndRemoveFromLists(queryClient, listKey, id),
        ...snapshotAndRemoveFromUnified(queryClient, platformCoreQueryKeys.inbox.all, new Set([id])),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _id, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useUnarchiveNotification = () =>
  useNotificationRowPatch<number>({
    mutationKey: ["notifications", "unarchive"],
    request: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/unarchive`, undefined, undefined, notificationAckLazy),
    patch: (id) => (n) => (n.id === id ? { ...n, archivedAt: null } : n),
  });

export const usePinNotification = () =>
  useNotificationRowPatch<number>({
    mutationKey: ["notifications", "pin"],
    request: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/pin`, undefined, undefined, notificationAckLazy),
    patch: (id) => (n) => (n.id === id ? { ...n, pinned: true } : n),
  });

export const useUnpinNotification = () =>
  useNotificationRowPatch<number>({
    mutationKey: ["notifications", "unpin"],
    request: (id) => apiClient.patch<NotificationAck>(`/notifications/${id}/unpin`, undefined, undefined, notificationAckLazy),
    patch: (id) => (n) => (n.id === id ? { ...n, pinned: false } : n),
  });

export const useSnoozeNotification = () =>
  useNotificationRowPatch<{ id: number; snoozedUntil: string }>({
    mutationKey: ["notifications", "snooze"],
    request: ({ id, snoozedUntil }) =>
      apiClient.patch<NotificationAck>(`/notifications/${id}/snooze`, { snoozedUntil }, undefined, notificationAckLazy),
    patch:
      ({ id, snoozedUntil }) =>
      (n) =>
        n.id === id ? { ...n, snoozedUntil } : n,
  });

export const useBulkArchive = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number[], NotifMutationContext>({
    mutationKey: ["notifications", "bulk-archive"],
    mutationFn: (ids) =>
      apiClient.post<NotificationAck>("/notifications/bulk/archive", { ids }, undefined, notificationAckLazy),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = countUnreadAmong(queryClient, listKey, idSet);
      const archivedAt = new Date().toISOString();
      const previousLists = [
        ...snapshotAndPatchLists(queryClient, listKey, (n) =>
          idSet.has(n.id) ? { ...n, archivedAt } : n,
        ),
        ...snapshotAndRemoveFromUnified(queryClient, platformCoreQueryKeys.inbox.all, idSet),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useBulkDelete = () => {
  const { invalidateInbox, queryClient } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number[], NotifMutationContext>({
    mutationKey: ["notifications", "bulk-delete"],
    mutationFn: (ids) =>
      apiClient.post<NotificationAck>("/notifications/bulk/delete", { ids }, undefined, notificationAckLazy),
    onMutate: async (ids) => {
      const idSet = new Set(ids);
      const { listKey, unreadKey, previousCount } = await beginInboxPatch(queryClient);
      const cleared = countUnreadAmong(queryClient, listKey, idSet);
      const previousLists = [
        ...snapshotAndRemoveFromListsMulti(queryClient, listKey, idSet),
        ...snapshotAndRemoveFromUnified(queryClient, platformCoreQueryKeys.inbox.all, idSet),
      ];
      applyUnreadDelta(queryClient, unreadKey, cleared);
      return { previousLists, previousCount };
    },
    onError: (_err, _ids, context) => restoreInboxSnapshot(queryClient, context),
    onSettled: () => invalidateInbox(),
  });
};

export const useApproveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number>({
    mutationKey: ["notifications", "approve"],
    mutationFn: (id) => apiClient.post<NotificationAck>(`/notifications/${id}/approve`, undefined, undefined, notificationAckLazy),
    onSettled: () => invalidateInbox(),
  });
};

export const useRejectNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<NotificationAck, Error, number>({
    mutationKey: ["notifications", "reject"],
    mutationFn: (id) => apiClient.post<NotificationAck>(`/notifications/${id}/reject`, undefined, undefined, notificationAckLazy),
    onSettled: () => invalidateInbox(),
  });
};
