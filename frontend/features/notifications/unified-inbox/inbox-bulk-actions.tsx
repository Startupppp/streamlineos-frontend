"use client";

import { useCallback, useState } from "react";
import { Archive, CheckCheck, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { NotificationInboxItem, UnifiedInboxItem } from "@/types/inbox";
import type { InboxActions } from "./use-inbox-actions";

export interface BulkActionsBarProps {
  selectedKeys: Set<string>;
  items: UnifiedInboxItem[];
  actions: InboxActions;
  onClearSelection: () => void;
}

function getNotificationIds(
  items: UnifiedInboxItem[],
  selectedKeys: Set<string>,
): number[] {
  return items
    .filter(
      (item): item is NotificationInboxItem =>
        selectedKeys.has(item.dedupKey) && item.kind === "notification",
    )
    .map((item) => item.id);
}

function actionLabel(
  label: string,
  eligibleCount: number,
  selectedCount: number,
): string {
  return eligibleCount === selectedCount
    ? label
    : `${label} (${String(eligibleCount)} notifications)`;
}

export function BulkActionsBar({
  selectedKeys,
  items,
  actions,
  onClearSelection,
}: BulkActionsBarProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const notifIds = getNotificationIds(items, selectedKeys);
  const hasNotificationActions = notifIds.length > 0;

  const handleMarkRead = useCallback(() => {
    for (const id of notifIds) actions.handleMarkRead(id);
    toast.success(
      `${String(notifIds.length)} item${notifIds.length !== 1 ? "s" : ""} marked read`,
    );
    onClearSelection();
  }, [notifIds, actions, onClearSelection]);

  const handleArchive = useCallback(() => {
    for (const id of notifIds) actions.handleArchive(id);
    toast.success(
      `${String(notifIds.length)} item${notifIds.length !== 1 ? "s" : ""} archived`,
      {
        action: {
          label: "Undo",
          onClick: () => {
            for (const id of notifIds) actions.handleUnarchive(id);
          },
        },
      },
    );
    onClearSelection();
  }, [notifIds, actions, onClearSelection]);

  const handleSnooze = useCallback(() => {
    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    for (const id of notifIds) actions.handleSnooze(id, snoozedUntil);
    toast.success("Snoozed for 1 hour");
    onClearSelection();
  }, [notifIds, actions, onClearSelection]);

  const handleDeleteConfirmed = useCallback(() => {
    setConfirmDeleteOpen(false);
    for (const id of notifIds) actions.handleDelete(id);
    toast.success(
      `${String(notifIds.length)} item${notifIds.length !== 1 ? "s" : ""} deleted`,
    );
    onClearSelection();
  }, [notifIds, actions, onClearSelection]);

  const handleOpenDeleteConfirm = useCallback(
    () => setConfirmDeleteOpen(true),
    [],
  );

  const handleCloseDeleteConfirm = useCallback(
    (open: boolean) => setConfirmDeleteOpen(open),
    [],
  );

  if (selectedKeys.size === 0) return null;

  return (
    <div className="shrink-0 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 flex-wrap">
      <span className="text-sm font-medium text-foreground shrink-0">
        {selectedKeys.size} selected
      </span>
      {hasNotificationActions && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkRead}
        >
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          {actionLabel("Mark read", notifIds.length, selectedKeys.size)}
        </Button>
      )}
      {hasNotificationActions && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleArchive}
        >
          <Archive className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          {actionLabel("Archive", notifIds.length, selectedKeys.size)}
        </Button>
      )}
      {hasNotificationActions && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSnooze}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          {actionLabel("Snooze 1h", notifIds.length, selectedKeys.size)}
        </Button>
      )}
      {hasNotificationActions && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenDeleteConfirm}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            {actionLabel("Delete", notifIds.length, selectedKeys.size)}
          </Button>
          <ConfirmDialog
            open={confirmDeleteOpen}
            onOpenChange={handleCloseDeleteConfirm}
            title="Delete notifications"
            description={`Permanently delete ${String(notifIds.length)} notification${notifIds.length !== 1 ? "s" : ""}? This cannot be undone.`}
            confirmLabel="Delete"
            destructive
            onConfirm={handleDeleteConfirmed}
          />
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={onClearSelection}
      >
        Clear
      </Button>
    </div>
  );
}
