"use client";

import { memo, useCallback } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface StageSkipDialogProps {
  dialog: { id: number; from: string; to: string; skipped: string[] } | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const StageSkipDialog = memo(function StageSkipDialog({
  dialog,
  isPending,
  onOpenChange,
  onCancel,
  onConfirm,
}: StageSkipDialogProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onCancel();
      onOpenChange(open);
    },
    [onCancel, onOpenChange],
  );

  return (
    <ConfirmDialog
      open={dialog !== null}
      onOpenChange={handleOpenChange}
      title="Skip stages?"
      description={
        dialog
          ? `You are moving this deal from ${dialog.from} to ${dialog.to}, skipping: ${dialog.skipped.join(", ")}. Are you sure you want to skip these stages?`
          : ""
      }
      confirmLabel={isPending ? "Confirming…" : "Confirm skip"}
      cancelLabel="Cancel"
      onConfirm={onConfirm}
    />
  );
});
