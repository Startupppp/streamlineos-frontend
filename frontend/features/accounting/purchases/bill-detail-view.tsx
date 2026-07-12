"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import type { PurchaseBill, PurchaseBillStatus } from "@/types/accounting";

const STATUS_CLASS: Record<PurchaseBillStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200/70",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200/70",
  POSTED: "bg-blue-50 text-blue-700 border-blue-200/70",
  PARTIALLY_PAID: "bg-sky-50 text-sky-700 border-sky-200/70",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200/70",
};

const STATUS_LABEL: Record<PurchaseBillStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
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

interface BillDetailViewProps {
  bill: PurchaseBill;
  outstanding: number;
  isPendingApproval: boolean;
  canApprove: boolean;
  canManage: boolean;
  isApprovePending: boolean;
  isCancelPending: boolean;
  onApprove: () => void;
  onOpenCancelDialog: () => void;
}

export function BillDetailView({
  bill,
  outstanding,
  isPendingApproval,
  canApprove,
  canManage,
  isApprovePending,
  isCancelPending,
  onApprove,
  onOpenCancelDialog,
}: BillDetailViewProps) {
  return (
    <div className="space-y-4">
      {isPendingApproval && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-800">Pending approval</p>
            <p className="text-xs text-blue-700 mt-0.5">
              This bill is awaiting approval before it can be posted.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {canApprove && (
              <LoadingButton
                size="sm"
                isPending={isApprovePending}
                loadingText="Approving…"
                onClick={onApprove}
              >
                Approve
              </LoadingButton>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenCancelDialog}
                disabled={isCancelPending}
              >
                Cancel bill
              </Button>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Status</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_CLASS[bill.status]}`}
              >
                {STATUS_LABEL[bill.status]}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Vendor</p>
              <p className="text-sm text-foreground">{bill.vendorName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Vendor bill #</p>
              <p className="text-sm text-foreground">{bill.vendorBillNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Bill date</p>
              <p className="text-sm tabular-nums text-foreground">{formatDate(bill.billDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Due date</p>
              <p className="text-sm tabular-nums text-foreground">{formatDate(bill.dueDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Place of supply</p>
              <p className="text-sm text-foreground">{bill.placeOfSupply ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Vendor GSTIN</p>
              <p className="text-sm font-mono text-foreground">{bill.vendorGstin ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Supplier GSTIN</p>
              <p className="text-sm font-mono text-foreground">{bill.supplierGstin ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Reverse charge</p>
              <p className="text-sm text-foreground">{bill.reverseCharge ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Expense account</p>
              <p className="text-sm font-mono text-foreground">{bill.expenseAccountCode ?? "—"}</p>
            </div>
            {bill.notes && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground leading-relaxed">{bill.notes}</p>
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
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  No line items
                </TableCell>
              </TableRow>
            ) : (
              bill.items.map((item) => (
                <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                  <TableCell className="text-sm text-foreground">{item.description}</TableCell>
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
                      (Number(item.quantity) * Number(item.rate) * Number(item.gstRate)) / 100,
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums font-medium">
                    {formatNum(
                      Number(item.quantity) * Number(item.rate) * (1 + Number(item.gstRate) / 100),
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
              <span className={outstanding > 0.005 ? "text-amber-600" : "text-emerald-600"}>
                {formatNum(outstanding)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {bill.payments && bill.payments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Payments</h2>
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
                      {PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod}
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
    </div>
  );
}
