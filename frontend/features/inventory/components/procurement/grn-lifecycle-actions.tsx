"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCancelGrn,
  usePostGrn,
  useReverseGrn,
  useStartGrnCount,
  useSubmitGrnForQuality,
} from "@/hooks/api/inventory/operations";
import type { GrnStatus } from "@/features/inventory/lib/inventory-status";

export interface GrnLifecycleActionsProps {
  grnId: number;
  grnNumber: string;
  status: GrnStatus;
  canReceive: boolean;
  onReversed: () => void;
}

export function GrnLifecycleActions({
  grnId,
  grnNumber,
  status,
  canReceive,
  onReversed,
}: GrnLifecycleActionsProps) {
  const startCount = useStartGrnCount();
  const submitQuality = useSubmitGrnForQuality();
  const postGrn = usePostGrn();
  const cancelGrn = useCancelGrn();
  const reverseGrn = useReverseGrn();

  const [cancelOpen, setCancelOpen] = useState<boolean>(false);
  const [reverseOpen, setReverseOpen] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");

  function handleReasonChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setReason(event.target.value);
  }

  function handleStartCount(): void {
    startCount.mutate(
      { grnId },
      {
        onSuccess: () => toast.success("Counting started"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleSubmitQuality(): void {
    submitQuality.mutate(
      { grnId },
      {
        onSuccess: () => toast.success("Sent for quality review"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handlePost(): void {
    postGrn.mutate(
      { grnId },
      {
        onSuccess: () => toast.success(`GRN ${grnNumber} posted to stock`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleOpenCancel(): void {
    setReason("");
    setCancelOpen(true);
  }

  function handleOpenReverse(): void {
    setReason("");
    setReverseOpen(true);
  }

  function handleConfirmCancel(): void {
    cancelGrn.mutate(
      { grnId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`GRN ${grnNumber} cancelled`);
          setCancelOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleConfirmReverse(): void {
    if (!reason.trim()) {
      toast.error("A reversal reason is required");
      return;
    }
    reverseGrn.mutate(
      { grnId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`GRN ${grnNumber} reversed`);
          setReverseOpen(false);
          onReversed();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (!canReceive) return null;
  if (status === "CANCELLED") return null;

  const open = status === "DRAFT" || status === "COUNTING" || status === "QUALITY_REVIEW";

  return (
    <>
      <div className="flex w-full flex-wrap items-center gap-2">
        {status === "DRAFT" ? (
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartCount}
            isPending={startCount.isPending}
            loadingText="Starting…"
          >
            Start count
          </LoadingButton>
        ) : null}
        {status === "COUNTING" ? (
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSubmitQuality}
            isPending={submitQuality.isPending}
            loadingText="Sending…"
          >
            Send to quality
          </LoadingButton>
        ) : null}
        {status === "QUALITY_REVIEW" ? (
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartCount}
            isPending={startCount.isPending}
            loadingText="Reopening…"
          >
            Back to counting
          </LoadingButton>
        ) : null}
        {open ? (
          <LoadingButton
            type="button"
            size="sm"
            onClick={handlePost}
            isPending={postGrn.isPending}
            loadingText="Posting…"
          >
            Post to stock
          </LoadingButton>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {open ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleOpenCancel}>
              Cancel receipt
            </Button>
          ) : null}
          {status === "POSTED" ? (
            <Button type="button" variant="destructive" size="sm" onClick={handleOpenReverse}>
              Reverse GRN
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        destructive
        keepOpenOnConfirm
        isPending={cancelGrn.isPending}
        title={`Cancel GRN ${grnNumber}?`}
        description="The receipt stays on record and can never be posted. Nothing has moved in stock, so nothing is reversed."
        confirmLabel="Cancel receipt"
        cancelLabel="Keep counting"
        content={
          <div className="space-y-1.5 py-2">
            <Label htmlFor="grn-cancel-reason" className="text-sm">Reason</Label>
            <Input
              id="grn-cancel-reason"
              value={reason}
              onChange={handleReasonChange}
              placeholder="e.g. Truck sent back at the gate"
            />
          </div>
        }
        onConfirm={handleConfirmCancel}
      />

      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        destructive
        keepOpenOnConfirm
        isPending={reverseGrn.isPending}
        title={`Reverse GRN ${grnNumber}?`}
        description="This writes compensating movements for every line this receipt posted, and credits the quantity back to the purchase order."
        confirmLabel="Reverse GRN"
        content={
          <div className="space-y-1.5 py-2">
            <Label htmlFor="grn-reverse-reason" className="text-sm">Reason *</Label>
            <Input
              id="grn-reverse-reason"
              value={reason}
              onChange={handleReasonChange}
              placeholder="e.g. Wrong items received"
            />
          </div>
        }
        onConfirm={handleConfirmReverse}
      />
    </>
  );
}
