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
import { useRunWhenOnline } from "@/hooks/common/use-run-when-online";
import { normalizeBuildDeepLink } from "@/lib/build/normalize-build-deep-link";
import type { NotificationSection } from "@/lib/notification-types";

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
  /**
   * Every mutation below goes through this. All fourteen used to fire regardless
   * of connectivity, underneath this page's own offline banner: the request
   * failed, the optimistic patch applied and rolled back, and the row visibly
   * flickered back to where it started. The sibling /inbox surface has guarded
   * its eight since it was written.
   */
  const { isOnline, runWhenOnline } = useRunWhenOnline();

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
      // Opening a row is not a command, so this one stays silent offline rather
      // than toasting at someone who only wanted to read.
      if (!notification.isRead && isOnline) markRead.mutate(notification.id);
    },
    [isOnline, markRead, setDetailId],
  );

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setDetailId(null);
    },
    [setDetailId],
  );

  const handleOpenLink = useCallback(
    (link: string) => {
      router.push(normalizeBuildDeepLink(link));
    },
    [router],
  );

  const handleMarkReadOne = useCallback(
    (id: number) => {
      runWhenOnline(() => markRead.mutate(id));
    },
    [markRead, runWhenOnline],
  );

  const handleUnarchive = useCallback(
    (id: number) => {
      runWhenOnline(() => unarchive.mutate(id));
    },
    [runWhenOnline, unarchive],
  );

  const handleSnooze = useCallback(
    (id: number, snoozedUntil: string) => {
      runWhenOnline(() => snooze.mutate({ notificationId: id, snoozedUntil }));
    },
    [runWhenOnline, snooze],
  );

  const handleMarkAllRead = useCallback(() => {
    runWhenOnline(() => markAllRead.mutate(undefined));
  }, [markAllRead, runWhenOnline]);

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
      runWhenOnline(() => archive.mutate(id));
    },
    [archive, runWhenOnline],
  );

  const handlePin = useCallback(
    (id: number, isPinned: boolean) => {
      runWhenOnline(() => {
        if (isPinned) unpin.mutate(id);
        else pin.mutate(id);
      });
    },
    [pin, runWhenOnline, unpin],
  );

  const handleDelete = useCallback(
    (id: number) => {
      runWhenOnline(() => {
        deleteMutation.mutate(id);
        // The selection is cleared inside the guard: clearing it for a delete that
        // never dispatched loses the user's selection for nothing.
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    },
    [deleteMutation, runWhenOnline, setSelectedIds],
  );

  const handleBulkMarkRead = useCallback(() => {
    runWhenOnline(() => {
      bulkMarkRead.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    });
  }, [bulkMarkRead, runWhenOnline, selectedIds, setSelectedIds]);

  const handleBulkArchive = useCallback(() => {
    runWhenOnline(() => {
      bulkArchive.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    });
  }, [bulkArchive, runWhenOnline, selectedIds, setSelectedIds]);

  const handleBulkDelete = useCallback(() => {
    runWhenOnline(() => {
      bulkDelete.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    });
  }, [bulkDelete, runWhenOnline, selectedIds, setSelectedIds]);

  const handleApprove = useCallback(
    (id: number) => {
      runWhenOnline(() => approve.mutate(id));
    },
    [approve, runWhenOnline],
  );

  const handleReject = useCallback(
    (id: number) => {
      runWhenOnline(() => reject.mutate(id));
    },
    [reject, runWhenOnline],
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
