"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { type NotificationAck, useNotificationRowPatch } from "./notifications-inbox-optimistic";

const notificationAckLazy = lazyContract(() =>
  import("@/hooks/api/notifications-schema").then((module) => module.notificationAckContract),
);

export const useArchiveNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "archive"],
  request: (id, config) => apiClient.patch<NotificationAck>(`/notifications/${id}/archive`, undefined, config, notificationAckLazy),
  patch: (id) => ({
    kind: "field", change: { field: "archivedAt", value: new Date().toISOString() },
    matches: (row) => row.id === id,
  }),
});
export const useUnarchiveNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "unarchive"],
  request: (id, config) => apiClient.patch<NotificationAck>(`/notifications/${id}/unarchive`, undefined, config, notificationAckLazy),
  patch: (id) => ({ kind: "field", change: { field: "archivedAt", value: null }, matches: (row) => row.id === id }),
});
export const useDeleteNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "delete"],
  request: (id, config) => apiClient.delete<NotificationAck>(`/notifications/${id}`, undefined, config, notificationAckLazy),
  patch: (id) => ({ kind: "remove", ids: new Set([id]) }),
});
export const usePinNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "pin"],
  request: (id, config) => apiClient.patch<NotificationAck>(`/notifications/${id}/pin`, undefined, config, notificationAckLazy),
  patch: (id) => ({ kind: "field", change: { field: "pinned", value: true }, matches: (row) => row.id === id }),
});
export const useUnpinNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "unpin"],
  request: (id, config) => apiClient.patch<NotificationAck>(`/notifications/${id}/unpin`, undefined, config, notificationAckLazy),
  patch: (id) => ({ kind: "field", change: { field: "pinned", value: false }, matches: (row) => row.id === id }),
});
export const useSnoozeNotification = () => useNotificationRowPatch<{ notificationId: number; snoozedUntil: string }>({
  mutationKey: ["notifications", "snooze"],
  request: ({ notificationId, snoozedUntil }, config) => apiClient.patch<NotificationAck>(
    `/notifications/${notificationId}/snooze`, { snoozedUntil }, config, notificationAckLazy,
  ),
  patch: ({ notificationId, snoozedUntil }) => ({
    kind: "field", change: { field: "snoozedUntil", value: snoozedUntil },
    matches: (row) => row.id === notificationId,
  }),
});
export const useUnsnoozeNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "unsnooze"],
  request: (id, config) => apiClient.patch<NotificationAck>(`/notifications/${id}/unsnooze`, undefined, config, notificationAckLazy),
  patch: (id) => ({ kind: "field", change: { field: "snoozedUntil", value: null }, matches: (row) => row.id === id }),
});
export const useBulkArchive = () => useNotificationRowPatch<number[]>({
  mutationKey: ["notifications", "bulk-archive"],
  request: (ids, config) => apiClient.post<NotificationAck>("/notifications/bulk/archive", { ids }, config, notificationAckLazy),
  patch: (ids) => ({
    kind: "field", change: { field: "archivedAt", value: new Date().toISOString() },
    matches: (row) => ids.includes(row.id),
  }),
});
export const useBulkDelete = () => useNotificationRowPatch<number[]>({
  mutationKey: ["notifications", "bulk-delete"],
  request: (ids, config) => apiClient.post<NotificationAck>("/notifications/bulk/delete", { ids }, config, notificationAckLazy),
  patch: (ids) => ({ kind: "remove", ids: new Set(ids) }),
});
export const useApproveNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "approve"],
  request: (id, config) => apiClient.post<NotificationAck>(`/notifications/${id}/approve`, undefined, config, notificationAckLazy),
});
export const useRejectNotification = () => useNotificationRowPatch<number>({
  mutationKey: ["notifications", "reject"],
  request: (id, config) => apiClient.post<NotificationAck>(`/notifications/${id}/reject`, undefined, config, notificationAckLazy),
});
