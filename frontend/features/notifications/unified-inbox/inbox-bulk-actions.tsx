"use client";

import { useCallback, useState } from "react";
import { Archive, CheckCheck, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { UnifiedInboxItem, InboxKind } from "@/types/inbox";
import { resolvedCapabilities } from "./inbox-kind-capabilities";
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
      (item) => selectedKeys.has(item.dedupKey) && item.kind === "notification",
    )
    .map((item) => item.id as number);
}

function getSelectedKinds(
  items: UnifiedInboxItem[],
  selectedKeys: Set<string>,
): InboxKind[] {
  return [
    ...new Set(
      items
        .filter((item) => selectedKeys.has(item.dedupKey))
        .map((item) => item.kind),
    ),
  ];
}

export function BulkActionsBar({
  selectedKeys,
  items,
  actions,
  onClearSelection,
}: BulkActionsBarProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const kinds = getSelectedKinds(items, selectedKeys);
  const caps = resolvedCapabilities(kinds);
  const notifIds = getNotificationIds(items, selectedKeys);

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
      {caps.canMarkRead && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkRead}
        >
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          Mark read
        </Button>
      )}
      {caps.canArchive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleArchive}
        >
          <Archive className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          Archive
        </Button>
      )}
      {caps.canSnooze && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSnooze}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          Snooze 1h
        </Button>
      )}
      {caps.canDelete && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenDeleteConfirm}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Delete
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
