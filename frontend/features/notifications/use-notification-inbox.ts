"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useArchiveNotification,
  usePinNotification,
  useUnpinNotification,
  useDeleteNotification,
  useBulkMarkRead,
  useBulkArchive,
  useBulkDelete,
  useApproveNotification,
  useRejectNotification,
  useSnoozeNotification,
  useUnarchiveNotification,
} from "@/hooks/api/notifications";
import type { NotificationSection } from "./notification-types";

interface Params {
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setDetailId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedIds: Set<number>;
  items: Array<{ id: number }>;
  activeSection: NotificationSection;
  debouncedSearch: string;
}

export function useNotificationInbox({
  setSelectedIds,
  setDetailId,
  selectedIds,
  items,
  activeSection,
  debouncedSearch,
}: Params) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archive = useArchiveNotification();
  const pin = usePinNotification();
  const unpin = useUnpinNotification();
  const deleteMutation = useDeleteNotification();
  const bulkMarkRead = useBulkMarkRead();
  const bulkArchive = useBulkArchive();
  const bulkDelete = useBulkDelete();
  const approve = useApproveNotification();
  const reject = useRejectNotification();
  const snooze = useSnoozeNotification();
  const unarchive = useUnarchiveNotification();

  const handleNotificationClick = useCallback(
    (notification: { id: number; isRead: boolean; link: string | null }) => {
      setDetailId(notification.id);
      if (!notification.isRead) markRead.mutate(notification.id);
    },
    [markRead, setDetailId],
  );

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setDetailId(null);
    },
    [setDetailId],
  );

  const handleOpenLink = useCallback(
    (link: string) => {
      router.push(link);
    },
    [router],
  );

  const handleMarkReadOne = useCallback(
    (id: number) => {
      markRead.mutate(id);
    },
    [markRead],
  );

  const handleUnarchive = useCallback(
    (id: number) => {
      unarchive.mutate(id);
    },
    [unarchive],
  );

  const handleSnooze = useCallback(
    (id: number, snoozedUntil: string) => {
      snooze.mutate({ id, snoozedUntil });
    },
    [snooze],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined);
  }, [markAllRead]);

  const handleSelect = useCallback(
    (id: number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [setSelectedIds],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((n) => n.id)));
  }, [items, setSelectedIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  const handleArchive = useCallback(
    (id: number) => {
      archive.mutate(id);
    },
    [archive],
  );

  const handlePin = useCallback(
    (id: number, isPinned: boolean) => {
      if (isPinned) unpin.mutate(id);
      else pin.mutate(id);
    },
    [pin, unpin],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteMutation.mutate(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [deleteMutation, setSelectedIds],
  );

  const handleBulkMarkRead = useCallback(() => {
    bulkMarkRead.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [bulkMarkRead, selectedIds, setSelectedIds]);

  const handleBulkArchive = useCallback(() => {
    bulkArchive.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [bulkArchive, selectedIds, setSelectedIds]);

  const handleBulkDelete = useCallback(() => {
    bulkDelete.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [bulkDelete, selectedIds, setSelectedIds]);

  const handleApprove = useCallback(
    (id: number) => {
      approve.mutate(id);
    },
    [approve],
  );

  const handleReject = useCallback(
    (id: number) => {
      reject.mutate(id);
    },
    [reject],
  );

  const emptyTitle = useMemo(() => {
    if (debouncedSearch) return "No matching notifications";
    if (activeSection === "UNREAD") return "You're all caught up";
    if (activeSection === "ARCHIVED") return "No archived notifications";
    if (activeSection === "APPROVALS") return "No pending approvals";
    if (activeSection === "MENTIONS") return "No mentions yet";
    if (activeSection === "ASSIGNED_TO_ME") return "Nothing assigned to you";
    if (activeSection === "BROADCASTS") return "No broadcasts";
    if (activeSection === "SYSTEM") return "No system notifications";
    return "No notifications yet";
  }, [activeSection, debouncedSearch]);

  const emptyDescription = useMemo(() => {
    if (debouncedSearch) return "Try different search terms or clear the search.";
    if (activeSection === "UNREAD") return "All notifications have been read.";
    if (activeSection === "ARCHIVED") return "Notifications you archive will appear here.";
    if (activeSection === "APPROVALS") return "Approval requests will appear here when they need your attention.";
    if (activeSection === "MENTIONS") return "You'll see notifications when someone mentions you.";
    if (activeSection === "ASSIGNED_TO_ME") return "Tasks and items assigned to you will appear here.";
    if (activeSection === "BROADCASTS") return "Organization-wide announcements will appear here.";
    return "When something important happens, you'll see it here.";
  }, [activeSection, debouncedSearch]);

  const rowVariants = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
      };

  return {
    handlers: {
      handleNotificationClick,
      handleDrawerOpenChange,
      handleOpenLink,
      handleMarkReadOne,
      handleUnarchive,
      handleSnooze,
      handleMarkAllRead,
      handleSelect,
      handleSelectAll,
      handleDeselectAll,
      handleArchive,
      handlePin,
      handleDelete,
      handleBulkMarkRead,
      handleBulkArchive,
      handleBulkDelete,
      handleApprove,
      handleReject,
    },
    mutations: {
      markRead,
      markAllRead,
      archive,
      pin,
      unpin,
      deleteMutation,
      bulkMarkRead,
      bulkArchive,
      bulkDelete,
      approve,
      reject,
      snooze,
      unarchive,
    },
    emptyTitle,
    emptyDescription,
    rowVariants,
  };
}
