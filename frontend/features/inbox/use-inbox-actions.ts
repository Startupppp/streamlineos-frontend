"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRunWhenOnline,
  INBOX_OFFLINE_MESSAGE as OFFLINE_MESSAGE,
} from "@/hooks/common/use-run-when-online";
import {
  useMarkNotificationRead,
  useArchiveNotification,
  useUnarchiveNotification,
  useDeleteNotification,
  useApproveNotification,
  useRejectNotification,
  usePinNotification,
  useUnpinNotification,
  useSnoozeNotification,
} from "@/hooks/api/notifications";

/**
 * Re-exported from the shared hook, which is where the guard itself now lives:
 * `/notifications` fired all fourteen of its mutations offline while this surface
 * guarded all eight of its, so one copy serves both.
 */
export const INBOX_OFFLINE_MESSAGE = OFFLINE_MESSAGE;

export interface InboxActions {
  isOnline: boolean;
  markReadOnOpen: (id: number) => void;
  handleMarkRead: (id: number) => void;
  handleArchive: (id: number) => void;
  handleUnarchive: (id: number) => void;
  handlePin: (id: number, pinned: boolean) => void;
  handleSnooze: (id: number, snoozedUntil: string) => void;
  handleDelete: (id: number) => void;
  handleApprove: (id: number) => void;
  handleReject: (id: number) => void;
  approvingId: number | undefined;
  rejectingId: number | undefined;
  archivingId: number | undefined;
  deletingId: number | undefined;
}

function reportError(err: unknown): void {
  toast.error(getErrorMessage(err));
}

export function useInboxActions(): InboxActions {
  const { isOnline, runWhenOnline } = useRunWhenOnline();
  const markRead = useMarkNotificationRead();
  const archive = useArchiveNotification();
  const unarchive = useUnarchiveNotification();
  const del = useDeleteNotification();
  const pin = usePinNotification();
  const unpin = useUnpinNotification();
  const snooze = useSnoozeNotification();
  const approve = useApproveNotification();
  const reject = useRejectNotification();

  const markReadMutate = markRead.mutate;
  const markReadOnOpen = useCallback(
    (id: number) => {
      if (!isOnline) return;
      markReadMutate(id);
    },
    [isOnline, markReadMutate],
  );

  const handleMarkRead = useCallback(
    (id: number) => runWhenOnline(() => markReadMutate(id)),
    [runWhenOnline, markReadMutate],
  );

  const archiveMutate = archive.mutate;
  const handleArchive = useCallback(
    (id: number) =>
      runWhenOnline(() => archiveMutate(id, { onError: reportError })),
    [runWhenOnline, archiveMutate],
  );

  const unarchiveMutate = unarchive.mutate;
  const handleUnarchive = useCallback(
    (id: number) =>
      runWhenOnline(() => unarchiveMutate(id, { onError: reportError })),
    [runWhenOnline, unarchiveMutate],
  );

  const pinMutate = pin.mutate;
  const unpinMutate = unpin.mutate;
  const handlePin = useCallback(
    (id: number, pinned: boolean) =>
      runWhenOnline(() => {
        if (pinned) pinMutate(id, { onError: reportError });
        else unpinMutate(id, { onError: reportError });
      }),
    [runWhenOnline, pinMutate, unpinMutate],
  );

  const snoozeMutate = snooze.mutate;
  const handleSnooze = useCallback(
    (id: number, snoozedUntil: string) =>
      runWhenOnline(() =>
        snoozeMutate({ id, snoozedUntil }, { onError: reportError }),
      ),
    [runWhenOnline, snoozeMutate],
  );

  const deleteMutate = del.mutate;
  const handleDelete = useCallback(
    (id: number) =>
      runWhenOnline(() => deleteMutate(id, { onError: reportError })),
    [runWhenOnline, deleteMutate],
  );

  const approveMutate = approve.mutate;
  const handleApprove = useCallback(
    (id: number) =>
      runWhenOnline(() =>
        approveMutate(id, {
          onSuccess: () => toast.success("Approved"),
          onError: reportError,
        }),
      ),
    [runWhenOnline, approveMutate],
  );

  const rejectMutate = reject.mutate;
  const handleReject = useCallback(
    (id: number) =>
      runWhenOnline(() =>
        rejectMutate(id, {
          onSuccess: () => toast.success("Rejected"),
          onError: reportError,
        }),
      ),
    [runWhenOnline, rejectMutate],
  );

  return {
    isOnline,
    markReadOnOpen,
    handleMarkRead,
    handleArchive,
    handleUnarchive,
    handlePin,
    handleSnooze,
    handleDelete,
    handleApprove,
    handleReject,
    approvingId: approve.isPending ? approve.variables : undefined,
    rejectingId: reject.isPending ? reject.variables : undefined,
    archivingId: archive.isPending ? archive.variables : undefined,
    deletingId: del.isPending ? del.variables : undefined,
  };
}
