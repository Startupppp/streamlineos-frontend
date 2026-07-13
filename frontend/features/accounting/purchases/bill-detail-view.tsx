"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import type { PurchaseBill, PurchaseBillStatus } from "@/types/accounting";

const STATUS_CLASS: Record<PurchaseBillStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200/70",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200/70",
  POSTED: "bg-blue-50 text-blue-700 border-blue-200/70",
  PARTIALLY_PAID: "bg-sky-50 text-sky-700 border-sky-200/70",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  CANCELLED: "bg-muted text-muted-foreground border-border",
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

type BillItem = PurchaseBill["items"][number];
type BillPayment = NonNullable<PurchaseBill["payments"]>[number];

const ITEM_COLUMNS: DataTableColumn<BillItem>[] = [
  {
    key: "description",
    header: "Description",
    cell: (row) => <span className="text-sm text-foreground">{row.description}</span>,
  },
  {
    key: "hsnSacCode",
    header: "HSN/SAC",
    cell: (row) => (
      <span className="text-sm font-mono text-muted-foreground">{row.hsnSacCode ?? "—"}</span>
    ),
  },
  {
    key: "quantity",
    header: "Qty",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums",
    cell: (row) => formatNum(row.quantity),
  },
  {
    key: "rate",
    header: "Rate",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums",
    cell: (row) => formatNum(row.rate),
  },
  {
    key: "gstRate",
    header: "GST %",
    headerClassName: "text-right",
    className: "text-right text-sm tabular-nums",
    cell: (row) => `${formatNum(row.gstRate)}%`,
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums",
    cell: (row) => formatNum(row.amount),
  },
  {
    key: "tax",
    header: "Tax",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums text-muted-foreground",
    cell: (row) =>
      formatNum(
        (Number(row.quantity) * Number(row.rate) * Number(row.gstRate)) / 100,
      ),
  },
  {
    key: "total",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums font-medium",
    cell: (row) =>
      formatNum(
        Number(row.quantity) * Number(row.rate) * (1 + Number(row.gstRate) / 100),
      ),
  },
];

const PAYMENT_COLUMNS: DataTableColumn<BillPayment>[] = [
  {
    key: "paymentDate",
    header: "Date",
    className: "text-sm tabular-nums",
    cell: (row) => formatDate(row.paymentDate),
  },
  {
    key: "paymentMethod",
    header: "Method",
    className: "text-sm",
    cell: (row) => PAYMENT_METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod,
  },
  {
    key: "referenceNumber",
    header: "Reference",
    className: "text-sm text-muted-foreground font-mono",
    cell: (row) => row.referenceNumber ?? "—",
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums font-medium",
    cell: (row) => formatNum(row.amount),
  },
];

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

      <DataTable
        data={bill.items}
        columns={ITEM_COLUMNS}
        getRowKey={(row) => row.id}
        emptyState={
          <p className="text-center text-sm text-muted-foreground py-8">No line items</p>
        }
        minWidth="760px"
      />

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
          <DataTable
            data={bill.payments}
            columns={PAYMENT_COLUMNS}
            getRowKey={(row) => row.id}
          />
        </div>
      )}
    </div>
  );
}
