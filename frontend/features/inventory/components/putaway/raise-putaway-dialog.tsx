"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { useGoodsReceipts } from "@/hooks/api/inventory/operations";
import { useCreatePutawayTask } from "@/hooks/api/inventory/putaway";

interface RaisePutawayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (taskId: number) => void;
}

/**
 * Raise the walk for a delivery that has already landed.
 *
 * The receipt is the only input. What is being put away, how much of it, and
 * from where all come from what the receipt actually posted to the ledger — a
 * dialog that let somebody type a quantity would be raising a putaway for stock
 * that never arrived. Only POSTED receipts are offered, because an unposted one
 * has moved nothing yet.
 */
export function RaisePutawayDialog({ open, onOpenChange, onCreated }: RaisePutawayDialogProps) {
  const [grnId, setGrnId] = useState("");
  const receipts = useGoodsReceipts({ status: "POSTED", pageSize: 50 });
  const createTask = useCreatePutawayTask();

  const rows = receipts.data?.items ?? [];

  function handleOpenChange(next: boolean): void {
    if (!next) setGrnId("");
    onOpenChange(next);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  function handleReceiptChange(value: string): void {
    setGrnId(value);
  }

  function handleSubmit(): void {
    if (!grnId) return;
    createTask.mutate(
      { grnId: Number(grnId) },
      {
        onSuccess: (result) => {
          toast.success(
            result.quarantineLineCount > 0
              ? `${result.taskNumber} raised — ${result.quarantineLineCount} line(s) route to quarantine`
              : `${result.taskNumber} raised`,
          );
          setGrnId("");
          onOpenChange(false);
          onCreated(result.taskId);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Raise a putaway"
      description="Move a posted delivery off the receiving dock and onto the shelves."
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            onClick={handleSubmit}
            isPending={createTask.isPending}
            loadingText="Raising…"
            disabled={!grnId}
          >
            Raise task
          </LoadingButton>
        </div>
      }
    >
      <div className="grid gap-2">
        <Label htmlFor="putaway-receipt">Goods receipt</Label>
        {receipts.isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No posted receipts are waiting to be put away.
          </p>
        ) : (
          <Select value={grnId} onValueChange={handleReceiptChange}>
            <SelectTrigger id="putaway-receipt">
              <SelectValue placeholder="Which delivery is on the dock?" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {rows.map((receipt) => (
                <SelectItem key={receipt.id} value={String(receipt.id)}>
                  {receipt.grnNumber} · {formatShortDate(receipt.receivedDate)}
                  {receipt.purchaseOrder?.vendor?.name
                    ? ` · ${receipt.purchaseOrder.vendor.name}`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </AppDialog>
  );
}
