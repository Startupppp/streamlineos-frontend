"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CreditCard, Send } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import { usePurchaseBill, usePostPurchaseBill } from "@/hooks/api/accounting";
import { RecordVendorPaymentDialog } from "@/features/accounting/record-vendor-payment-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PurchaseBillStatus } from "@/types/accounting";

interface PurchaseBillDetailPageProps {
  params: Promise<{ billId: string }>;
}

const STATUS_CLASS: Record<PurchaseBillStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200/70",
  POSTED: "bg-blue-50 text-blue-700 border-blue-200/70",
  PARTIALLY_PAID: "bg-sky-50 text-sky-700 border-sky-200/70",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200/70",
};

const STATUS_LABEL: Record<PurchaseBillStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
}

function formatNum(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
}

export default function PurchaseBillDetailPage({
  params,
}: PurchaseBillDetailPageProps) {
  const { billId } = use(params);
  const id = Number(billId);

  const query = usePurchaseBill(id);
  const postMutation = usePostPurchaseBill(id);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const bill = query.data;

  const canPost = bill?.status === "DRAFT";
  const amountPaid = Number(bill?.amountPaid ?? 0);
  const total = Number(bill?.total ?? 0);
  const outstanding = total - amountPaid;
  const canRecordPayment =
    (bill?.status === "POSTED" || bill?.status === "PARTIALLY_PAID") &&
    outstanding > 0.005;

  const handleOpenPostDialog = useCallback(() => {
    setPostDialogOpen(true);
  }, []);

  const handlePostDialogChange = useCallback(
    (open: boolean) => {
      if (postMutation.isPending) return;
      setPostDialogOpen(open);
    },
    [postMutation.isPending],
  );

  const handlePostConfirm = useCallback(() => {
    postMutation.mutate(undefined, {
      onSuccess: () => {
        setPostDialogOpen(false);
        toast.success(`Bill ${bill?.billNumber ?? ""} posted`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [postMutation, bill?.billNumber]);

  const handleOpenPaymentDialog = useCallback(() => {
    setPaymentDialogOpen(true);
  }, []);

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Purchase Bills"
      title={bill?.billNumber ?? "Purchase bill"}
      subtitle={
        bill
          ? `${bill.vendorName ?? "Unknown vendor"} · ${formatDate(bill.billDate)}`
          : "Loading…"
      }
      actions={
        <div className="flex items-center gap-2">
          {canPost && (
            <Button
              size="sm"
              onClick={handleOpenPostDialog}
              disabled={postMutation.isPending}
            >
              <Send className="mr-1 h-4 w-4" />
              Post bill
            </Button>
          )}
          {canRecordPayment && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenPaymentDialog}
            >
              <CreditCard className="mr-1 h-4 w-4" />
              Record payment
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounting/purchase-bills">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {query.isLoading ? (
          <LoadingState variant="page" />
        ) : query.error ? (
          <ErrorState
            title="Failed to load bill"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : !bill ? (
          <ErrorState
            title="Bill not found"
            description={`No purchase bill found for ID ${billId}.`}
          />
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_CLASS[bill.status]}`}
                    >
                      {STATUS_LABEL[bill.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Vendor
                    </p>
                    <p className="text-sm text-foreground">
                      {bill.vendorName ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Vendor bill #
                    </p>
                    <p className="text-sm text-foreground">
                      {bill.vendorBillNumber ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Bill date
                    </p>
                    <p className="text-sm tabular-nums text-foreground">
                      {formatDate(bill.billDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Due date
                    </p>
                    <p className="text-sm tabular-nums text-foreground">
                      {formatDate(bill.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Place of supply
                    </p>
                    <p className="text-sm text-foreground">
                      {bill.placeOfSupply ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Vendor GSTIN
                    </p>
                    <p className="text-sm font-mono text-foreground">
                      {bill.vendorGstin ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Supplier GSTIN
                    </p>
                    <p className="text-sm font-mono text-foreground">
                      {bill.supplierGstin ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Reverse charge
                    </p>
                    <p className="text-sm text-foreground">
                      {bill.reverseCharge ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Expense account
                    </p>
                    <p className="text-sm font-mono text-foreground">
                      {bill.expenseAccountCode ?? "—"}
                    </p>
                  </div>
                  {bill.notes && (
                    <div className="col-span-2 sm:col-span-4">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {bill.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">HSN/SAC</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Qty</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Rate</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">GST %</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Tax</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No line items
                      </TableCell>
                    </TableRow>
                  ) : (
                    bill.items.map((item) => (
                      <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell className="text-sm text-foreground">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {item.hsnSacCode ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {formatNum(item.quantity)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {formatNum(item.rate)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatNum(item.gstRate)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {formatNum(item.amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {formatNum(
                            (Number(item.quantity) *
                              Number(item.rate) *
                              Number(item.gstRate)) /
                              100,
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums font-medium">
                          {formatNum(
                            Number(item.quantity) *
                              Number(item.rate) *
                              (1 + Number(item.gstRate) / 100),
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Card className="w-full max-w-sm">
                <CardContent className="p-4 space-y-1.5 text-sm tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatNum(bill.subtotal)}</span>
                  </div>
                  {Number(bill.discount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span>−{formatNum(bill.discount)}</span>
                    </div>
                  )}
                  {Number(bill.cgstAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CGST</span>
                      <span>{formatNum(bill.cgstAmount)}</span>
                    </div>
                  )}
                  {Number(bill.sgstAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGST</span>
                      <span>{formatNum(bill.sgstAmount)}</span>
                    </div>
                  )}
                  {Number(bill.igstAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IGST</span>
                      <span>{formatNum(bill.igstAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-1.5 flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>{formatNum(bill.total)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount paid</span>
                    <span>{formatNum(bill.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Outstanding</span>
                    <span
                      className={
                        outstanding > 0.005
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }
                    >
                      {formatNum(outstanding)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {bill.payments && bill.payments.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Payments
                </h2>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Date</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Method</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Reference</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bill.payments.map((payment) => (
                        <TableRow key={payment.id} className="border-b border-border/50 hover:bg-muted/30">
                          <TableCell className="text-sm tabular-nums">
                            {formatDate(payment.paymentDate)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {PAYMENT_METHOD_LABEL[payment.paymentMethod] ??
                              payment.paymentMethod}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {payment.referenceNumber ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums font-medium">
                            {formatNum(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={postDialogOpen}
        onOpenChange={handlePostDialogChange}
        title="Post this bill?"
        description="Once posted, the bill will be locked and a journal entry will be created. This action cannot be undone."
        confirmLabel={postMutation.isPending ? "Posting…" : "Post bill"}
        isPending={postMutation.isPending}
        onConfirm={handlePostConfirm}
      />

      {bill && (
        <RecordVendorPaymentDialog
          billId={id}
          billNumber={bill.billNumber}
          remaining={outstanding}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
        />
      )}
    </PageWrapper>
  );
}
