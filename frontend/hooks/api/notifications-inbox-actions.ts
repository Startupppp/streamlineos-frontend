"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useNotificationInboxInvalidation } from "./notifications-shared";

export const useArchiveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "archive"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/archive`),
    onSuccess: invalidateInbox,
  });
};

export const useUnarchiveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "unarchive"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unarchive`),
    onSuccess: invalidateInbox,
  });
};

export const useDeleteNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "delete"],
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
    onSuccess: invalidateInbox,
  });
};

export const usePinNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "pin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/pin`),
    onSuccess: invalidateInbox,
  });
};

export const useUnpinNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "unpin"],
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/unpin`),
    onSuccess: invalidateInbox,
  });
};

export const useSnoozeNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, { id: number; snoozedUntil: string }>({
    mutationKey: ["notifications", "snooze"],
    mutationFn: ({ id, snoozedUntil }) =>
      apiClient.patch<{ success: boolean }>(`/notifications/${id}/snooze`, { snoozedUntil }),
    onSuccess: invalidateInbox,
  });
};

export const useBulkArchive = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-archive"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/archive", { ids }),
    onSuccess: invalidateInbox,
  });
};

export const useBulkDelete = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number[]>({
    mutationKey: ["notifications", "bulk-delete"],
    mutationFn: (ids) => apiClient.post<{ success: boolean }>("/notifications/bulk/delete", { ids }),
    onSuccess: invalidateInbox,
  });
};

export const useApproveNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "approve"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/approve`),
    onSuccess: invalidateInbox,
  });
};

export const useRejectNotification = () => {
  const { invalidateInbox } = useNotificationInboxInvalidation();
  return useMutation<{ success: boolean }, Error, number>({
    mutationKey: ["notifications", "reject"],
    mutationFn: (id) => apiClient.post<{ success: boolean }>(`/notifications/${id}/reject`),
    onSuccess: invalidateInbox,
  });
};
