"use client";

import { memo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  return (
    <Dialog open={dialog !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Skip stages?</DialogTitle>
          <DialogDescription>
            You are moving this deal from <strong>{dialog?.from}</strong> to{" "}
            <strong>{dialog?.to}</strong>, skipping:{" "}
            <strong>{dialog?.skipped.join(", ")}</strong>.
            Are you sure you want to skip these stages?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gold hover:bg-gold/90 text-white"
            disabled={isPending}
            onClick={onConfirm}
          >
            Confirm Skip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
