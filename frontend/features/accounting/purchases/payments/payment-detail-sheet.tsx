"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { formatBasisPoints, formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useAllocateApPayment,
  useApDocuments,
  useApPayment,
  useReverseApPayment,
} from "@/hooks/api/accounting/ap";
import type { ApAllocationInput } from "@/types/accounting-ap-payments";
import { AP_PAYMENT_STATUS_LABELS, AP_PAYMENT_STATUS_TONES } from "../lib/ap-labels";
import { AllocateOpenBillsSheet } from "../shared/allocate-open-bills-sheet";

interface PaymentDetailSheetProps {
  paymentId: string | null;
  onOpenChange: (open: boolean) => void;
}

function FigureTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <p className="text-dense font-medium text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-dense text-muted-foreground">{hint}</p>
    </div>
  );
}

export function PaymentDetailSheet({ paymentId, onOpenChange }: PaymentDetailSheetProps) {
  const canApprove = useCan("accounting:payables:approve");
  const canManage = useCan("accounting:payables:manage");
  const [isReverseOpen, setIsReverseOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);

  const paymentQuery = useApPayment(paymentId ?? "", { enabled: !!paymentId });
  const reversePayment = useReverseApPayment();
  const allocatePayment = useAllocateApPayment();

  const payment = paymentQuery.data;

  const openBillsQuery = useApDocuments(
    {
      documentType: "BILL",
      partyId: payment?.partyId ?? "",
      openOnly: true,
      page: 1,
      pageSize: 50,
    },
    { enabled: isAllocateOpen && !!payment?.partyId },
  );

  const withheldRates = useMemo(
    () => (payment?.withholding ?? []).map((entry) => formatBasisPoints(entry.rateBp)).join(", "),
    [payment?.withholding],
  );

  function handleReverse(): void {
    if (!paymentId) return;
    reversePayment.mutate(
      { paymentId },
      {
        onSuccess: () => {
          toast.success("Payment reversed");
          setIsReverseOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleAllocate(allocations: ApAllocationInput[]): void {
    if (!paymentId) return;
    if (allocations.length === 0) {
      toast.error("Enter how much of this payment to put against a bill");
      return;
    }
    allocatePayment.mutate(
      { paymentId, allocations },
      {
        onSuccess: () => {
          toast.success("Payment allocated");
          setIsAllocateOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <>
      <AppSheet
        open={!!paymentId}
        onOpenChange={onOpenChange}
        title={payment ? `Paid ${payment.partyName}` : "Payment"}
        description={
          payment
            ? `${formatShortDate(payment.paymentDate)} · ${payment.paymentNumber ?? "not numbered"}`
            : undefined
        }
        className="sm:max-w-xl"
        footer={
          payment && payment.status === "POSTED" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={!canManage || payment.unappliedMinor <= 0}
                onClick={() => setIsAllocateOpen(true)}
              >
                Put against a bill
              </Button>
              <Button
                variant="outline"
                disabled={!canApprove}
                onClick={() => setIsReverseOpen(true)}
              >
                Reverse this payment
              </Button>
            </div>
          ) : null
        }
      >
        {paymentQuery.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : paymentQuery.isError || !payment ? (
          <ErrorState
            compact
            title="Couldn't load this payment"
            description={getErrorMessage(paymentQuery.error)}
            onRetry={() => void paymentQuery.refetch()}
          />
        ) : (
          <div className="space-y-4">
            <SemanticBadge
              tone={AP_PAYMENT_STATUS_TONES[payment.status]}
              label={AP_PAYMENT_STATUS_LABELS[payment.status]}
            />

            <div className="grid gap-2 sm:grid-cols-3">
              <FigureTile
                label="They invoiced"
                value={formatMinorMoney(payment.grossMinor, payment.currency)}
                hint="Before anything was held back"
              />
              <FigureTile
                label="Tax withheld"
                value={formatMinorMoney(payment.withheldMinor, payment.currency)}
                hint={withheldRates ? `At ${withheldRates}` : "Nothing held back"}
              />
              <FigureTile
                label="Actually left the account"
                value={formatMinorMoney(payment.netPaidMinor, payment.currency)}
                hint="What the vendor received"
              />
            </div>

            {payment.unappliedMinor > 0 ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-label">
                {formatMinorMoney(payment.unappliedMinor, payment.currency)} of this payment is not against
                any bill yet. It sits as money on account with this vendor.
              </p>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold">Bills this payment settled</p>
              {payment.allocations.length === 0 ? (
                <p className="text-label text-muted-foreground">
                  None yet — the whole payment is on account.
                </p>
              ) : (
                <ul className="space-y-2">
                  {payment.allocations.map((allocation) => (
                    <li
                      key={allocation.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card px-3 py-2"
                    >
                      <span className="truncate text-sm">
                        {allocation.vendorDocumentNumber ??
                          allocation.documentNumber ??
                          "Unnumbered bill"}
                      </span>
                      <span className="font-mono text-sm tabular-nums">
                        {formatMinorMoney(allocation.amountMinor, payment.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {payment.reference || payment.paymentMethod || payment.memo ? (
              <div className="space-y-1 border-t border-border pt-3 text-label text-muted-foreground">
                {payment.paymentMethod ? <p>Paid by {payment.paymentMethod}</p> : null}
                {payment.reference ? <p>Reference {payment.reference}</p> : null}
                {payment.memo ? <p>{payment.memo}</p> : null}
              </div>
            ) : null}
          </div>
        )}
      </AppSheet>

      <ConfirmDialog
        open={isReverseOpen}
        onOpenChange={setIsReverseOpen}
        title="Reverse this payment?"
        description="The books get an equal and opposite entry, the bills it settled go back to unpaid, and the original record stays for the audit trail."
        confirmLabel="Reverse payment"
        destructive
        isPending={reversePayment.isPending}
        keepOpenOnConfirm
        onConfirm={handleReverse}
      />

      {isAllocateOpen && payment ? (
        <AllocateOpenBillsSheet
          open={isAllocateOpen}
          onOpenChange={setIsAllocateOpen}
          title="Put this payment against a bill"
          description={`Spread the unapplied part of this payment across ${payment.partyName}'s unpaid bills.`}
          bills={openBillsQuery.data?.items ?? []}
          currency={payment.currency}
          availableMinor={payment.unappliedMinor}
          submitLabel="Allocate"
          isSubmitting={allocatePayment.isPending}
          onSubmit={handleAllocate}
        />
      ) : null}
    </>
  );
}
