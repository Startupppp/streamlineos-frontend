"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useMarkItemPaid,
  useMarkItemFailed,
  useEmployeeBankDetails,
} from "@/hooks/api/payroll/payout-batches";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PayoutBatchItem } from "@/types/payroll";

interface ItemActionDialogProps {
  type: "paid" | "failed";
  item: PayoutBatchItem;
  batchId: number;
  runId: number;
  onClose: () => void;
}

export function ItemActionDialog({
  type,
  item,
  batchId,
  runId,
  onClose,
}: ItemActionDialogProps) {
  const [value, setValue] = useState("");
  const markPaidMutation = useMarkItemPaid();
  const markFailedMutation = useMarkItemFailed();
  const isPending = markPaidMutation.isPending || markFailedMutation.isPending;

  function handleSubmit() {
    if (!value.trim()) return;
    if (type === "paid") {
      markPaidMutation.mutate(
        { batchId, itemId: item.id, transactionRef: value.trim(), runId },
        {
          onSuccess: () => {
            toast.success("Item marked as paid");
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      markFailedMutation.mutate(
        { batchId, itemId: item.id, failureReason: value.trim(), runId },
        {
          onSuccess: () => {
            toast.success("Item marked as failed");
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {type === "paid" ? "Mark Item Paid" : "Mark Item Failed"}
          </DialogTitle>
          <DialogDescription>
            {type === "paid"
              ? "Enter the transaction reference for this payment."
              : "Provide the reason for failure."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="item-action-value">
            {type === "paid" ? "Transaction Reference" : "Failure Reason"}
          </Label>
          <Input
            id="item-action-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              type === "paid" ? "e.g. NEFT0012345678" : "e.g. Account closed"
            }
            className=""
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isPending}
            variant={type === "failed" ? "destructive" : "default"}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {type === "paid" ? "Confirm Paid" : "Mark Failed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RevealCellProps {
  userId: string;
  masked: string;
}

export function RevealCell({ userId, masked }: RevealCellProps) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: bankDetails } = useEmployeeBankDetails(userId, revealed);

  function handleReveal() {
    setRevealed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), 15_000);
  }

  function handleHide() {
    setRevealed(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (revealed && bankDetails) {
    return (
      <div className="flex items-start gap-1.5">
        <div className="text-xs space-y-0.5">
          <p className="font-mono text-foreground">{bankDetails.accountNumber ?? "—"}</p>
          {bankDetails.bankName && (
            <p className="text-muted-foreground">
              {bankDetails.bankName}
              {bankDetails.ifsc ? ` · ${bankDetails.ifsc}` : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleHide}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Hide bank details"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{masked}</span>
      <button
        type="button"
        onClick={handleReveal}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Reveal bank details"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
