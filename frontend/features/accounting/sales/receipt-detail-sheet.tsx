"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppSheet, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  RECEIVABLES_APPROVE,
  RECEIVABLES_MANAGE,
  useAllocateArReceipt,
  useAllocateArReceiptFifo,
  useArReceipt,
  useReverseArReceipt,
} from "@/hooks/api/accounting/ar";
import { usePartyNames } from "../parties/use-party-names";
import type { AllocationLineInput } from "@/types/accounting/accounting-ar-receipts";
import { AllocationEditorDialog } from "./allocation-editor-dialog";
import { ReceiptStatusBadge } from "./ar-labels";

interface ReceiptDetailSheetProps {
  receiptId: string | null;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-label text-muted-foreground">{label}</span>
      <span className="font-mono text-label tabular-nums">{value}</span>
    </div>
  );
}

export function ReceiptDetailSheet({
  receiptId,
  onOpenChange,
}: ReceiptDetailSheetProps) {
  const canManage = useCan(RECEIVABLES_MANAGE);
  const canApprove = useCan(RECEIVABLES_APPROVE);
  const [applyOpen, setApplyOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);

  const receiptQuery = useArReceipt(receiptId ?? "", { enabled: !!receiptId });
  const receipt = receiptQuery.data;
  const partyNames = usePartyNames(receipt ? [receipt.partyId] : []);
  const allocate = useAllocateArReceipt();
  const allocateFifo = useAllocateArReceiptFifo();
  const reverse = useReverseArReceipt();

  function handleFifo(): void {
    if (!receiptId) return;
    allocateFifo.mutate(
      { receiptId },
      {
        onSuccess: () => toast.success("Applied to their oldest invoices"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleApplyReceipt(allocations: AllocationLineInput[]): void {
    if (!receipt) return;
    allocate.mutate(
      { receiptId: receipt.id, allocations },
      {
        onSuccess: () => {
          toast.success("Payment applied");
          setApplyOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleReverse(): void {
    if (!receiptId) return;
    reverse.mutate(
      { receiptId, input: {} },
      {
        onSuccess: () => {
          toast.success("Receipt reversed");
          setReverseOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
          setReverseOpen(false);
        },
      },
    );
  }

  const isReversed = receipt?.status === "REVERSED";
  const hasUnapplied = receipt !== undefined && receipt.unappliedMinor > 0;

  return (
    <AppSheet
      open={receiptId !== null}
      onOpenChange={onOpenChange}
      title={receipt?.receiptNumber ?? "Money in"}
      description={
        receipt ? partyNames.resolve(receipt.partyId) : "Loading the receipt…"
      }
      className="sm:max-w-lg"
      footer={
        receipt && !isReversed ? (
          <div className="grid w-full grid-flow-col auto-cols-fr gap-2">
            {canManage && hasUnapplied ? (
              <Button variant="outline" onClick={() => setApplyOpen(true)}>
                Choose invoices
              </Button>
            ) : null}
            {canManage && hasUnapplied ? (
              <LoadingButton
                isPending={allocateFifo.isPending}
                onClick={handleFifo}
              >
                Apply oldest first
              </LoadingButton>
            ) : null}
            {canApprove ? (
              <Button variant="outline" onClick={() => setReverseOpen(true)}>
                Reverse
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {receiptQuery.isError ? (
        <ErrorState
          compact
          title="Couldn't load this receipt"
          description={getErrorMessage(receiptQuery.error)}
          onRetry={() => void receiptQuery.refetch()}
        />
      ) : receiptQuery.isPending || !receipt ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ReceiptStatusBadge status={receipt.status} />
            <span className="text-label text-muted-foreground">
              {formatShortDate(receipt.receiptDate)}
            </span>
          </div>

          <div className="divide-y divide-border/60">
            <Row
              label="Received"
              value={formatMinorMoney(receipt.amountMinor, receipt.currency)}
            />
            <Row
              label="Applied to invoices"
              value={formatMinorMoney(receipt.appliedMinor, receipt.currency)}
            />
            <Row
              label="Still unapplied"
              value={formatMinorMoney(receipt.unappliedMinor, receipt.currency)}
            />
            {receipt.paymentMethod ? (
              <Row label="Paid by" value={receipt.paymentMethod} />
            ) : null}
            {receipt.reference ? (
              <Row label="Reference" value={receipt.reference} />
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-label font-medium">Where it went</p>
            {receipt.allocations.length === 0 ? (
              <p className="text-label text-muted-foreground">
                Sitting as an advance against their account.
              </p>
            ) : (
              <ul className="space-y-2">
                {receipt.allocations.map((allocation) => (
                  <li
                    key={allocation.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2"
                  >
                    <span className="truncate text-sm">
                      {allocation.documentNumber ?? "Invoice"}
                    </span>
                    <span className="font-mono text-label tabular-nums">
                      {formatMinorMoney(
                        allocation.amountMinor,
                        receipt.currency,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {receipt.memo ? (
            <p className="text-label text-muted-foreground">{receipt.memo}</p>
          ) : null}

          <AllocationEditorDialog
            open={applyOpen}
            onOpenChange={setApplyOpen}
            title="Apply this payment"
            description="Choose which invoices it should settle."
            partyId={receipt.partyId}
            currency={receipt.currency}
            availableMinor={receipt.unappliedMinor}
            isPending={allocate.isPending}
            onSubmit={handleApplyReceipt}
          />

          <ConfirmDialog
            open={reverseOpen}
            onOpenChange={setReverseOpen}
            title="Reverse this receipt?"
            description="Every invoice it settled goes back to being open, and the mirror entry is written to your books. This cannot be undone."
            confirmLabel="Reverse receipt"
            destructive
            isPending={reverse.isPending}
            onConfirm={handleReverse}
          />
        </div>
      )}
    </AppSheet>
  );
}
