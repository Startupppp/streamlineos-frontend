"use client";

import { useState } from "react";
import { AppDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";

interface RejectReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

export function RejectReasonDialog({
  open,
  onOpenChange,
  subject,
  isPending,
  onConfirm,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState("");

  function handleOpenChange(next: boolean): void {
    if (!next) setReason("");
    onOpenChange(next);
  }

  function handleReasonChange(
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ): void {
    setReason(event.target.value);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  function handleConfirm(): void {
    const trimmed = reason.trim();
    setReason("");
    onConfirm(trimmed);
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Reject request"
      description={`The reason is sent to the requester and kept on ${subject}. A rejection cannot be submitted without one.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            variant="destructive"
            isPending={isPending}
            disabled={reason.trim().length === 0}
            onClick={handleConfirm}
          >
            Reject
          </LoadingButton>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="action-center-reject-reason">Reason</Label>
        <Textarea
          id="action-center-reject-reason"
          value={reason}
          onChange={handleReasonChange}
          rows={3}
          placeholder="Why is this being rejected?"
        />
        {reason.trim().length === 0 ? (
          <p className="text-dense text-muted-foreground">
            Enter a reason to enable Reject.
          </p>
        ) : null}
      </div>
    </AppDialog>
  );
}
