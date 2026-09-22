"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface InboxBulkToolbarProps {
  selectedIds: Set<number>;
  totalVisible: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkMarkRead: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  isMutating: boolean;
}

export function InboxBulkToolbar({
  selectedIds,
  totalVisible,
  onSelectAll,
  onDeselectAll,
  onBulkMarkRead,
  onBulkArchive,
  onBulkDelete,
  isMutating,
}: InboxBulkToolbarProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const count = selectedIds.size;
  const allSelected = totalVisible > 0 && count >= totalVisible;

  function handleCheckboxChange(checked: boolean | "indeterminate") {
    if (checked === true || checked === "indeterminate") {
      if (allSelected) {
        onDeselectAll();
      } else {
        onSelectAll();
      }
    } else {
      onDeselectAll();
    }
  }

  function handleSelectAllClick(checked: boolean | "indeterminate") {
    if (checked === true) {
      onSelectAll();
    } else {
      onDeselectAll();
    }
  }

  function handleDeleteClick() {
    setConfirmDelete(true);
  }

  function handleDeleteConfirm() {
    onBulkDelete();
    setConfirmDelete(false);
  }

  function handleDeleteOpenChange(open: boolean) {
    setConfirmDelete(open);
  }

  void handleCheckboxChange;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAllClick}
          aria-label="Select all notifications"
        />
        {count > 0 ? (
          <>
            <span className="text-xs text-muted-foreground">{count} selected</span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isMutating}
                onClick={onBulkMarkRead}
                aria-label="Mark selected read"
              >
                Mark read
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isMutating}
                onClick={onBulkArchive}
                aria-label="Archive selected"
              >
                Archive
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                disabled={isMutating}
                onClick={handleDeleteClick}
                aria-label="Delete selected"
              >
                Delete
              </Button>
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={handleDeleteOpenChange}
        title="Delete notifications?"
        description={`Permanently delete ${count} notification${count !== 1 ? "s" : ""}? This cannot be undone.`}
        confirmLabel={`Delete ${count} notification${count !== 1 ? "s" : ""}`}
        destructive
        isPending={isMutating}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
