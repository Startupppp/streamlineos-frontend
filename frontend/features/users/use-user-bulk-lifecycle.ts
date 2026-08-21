"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useBulkArchive,
  useBulkRestore,
  useBulkSuspend,
} from "@/hooks/api/users";
import type { BulkActionResult } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import type { UserBulkAction } from "./user-bulk-action-copy";

function showLifecycleResult(
  action: UserBulkAction,
  result: BulkActionResult,
): void {
  const pastTense =
    action === "suspend"
      ? "suspended"
      : action === "archive"
        ? "archived"
        : "restored";
  if (result.failed > 0 && result.succeeded === 0) {
    toast.error(`Failed to ${action} ${result.failed} user(s)`);
    return;
  }
  if (result.failed > 0) {
    toast.warning(
      `${result.succeeded} user(s) ${pastTense}; ${result.failed} could not be updated`,
    );
    return;
  }
  if (action === "restore") {
    toast.success(`${result.succeeded} user(s) restored`, {
      description:
        "Access is restored. This organization will appear in each user's workspace switcher after their session refreshes.",
    });
    return;
  }
  toast.success(`${result.succeeded} user(s) ${pastTense}`);
}

export function useUserBulkLifecycle(
  selectedUserIds: ReadonlySet<string>,
  onComplete: () => void,
) {
  const [pendingBulkAction, setPendingBulkAction] = useState<UserBulkAction | null>(null);
  const { mutate: bulkSuspend, isPending: isSuspending } = useBulkSuspend();
  const { mutate: bulkArchive, isPending: isArchiving } = useBulkArchive();
  const { mutate: bulkRestore, isPending: isRestoring } = useBulkRestore();

  function runLifecycleMutation(action: UserBulkAction) {
    const mutation =
      action === "suspend"
        ? bulkSuspend
        : action === "archive"
          ? bulkArchive
          : bulkRestore;
    mutation(
      { userIds: Array.from(selectedUserIds) },
      {
        onSuccess: (result) => {
          showLifecycleResult(action, result);
          onComplete();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleRequestBulkSuspend() {
    setPendingBulkAction("suspend");
  }

  function handleRequestBulkArchive() {
    setPendingBulkAction("archive");
  }

  function handleRequestBulkRestore() {
    setPendingBulkAction("restore");
  }

  function handleBulkDialogOpenChange(open: boolean) {
    if (!open) setPendingBulkAction(null);
  }

  function handleConfirmBulkAction() {
    if (pendingBulkAction) runLifecycleMutation(pendingBulkAction);
    setPendingBulkAction(null);
  }

  return {
    pendingBulkAction,
    isSuspending,
    isArchiving,
    isRestoring,
    handleRequestBulkSuspend,
    handleRequestBulkArchive,
    handleRequestBulkRestore,
    handleBulkDialogOpenChange,
    handleConfirmBulkAction,
  };
}
