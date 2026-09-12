import { type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { PurchaseBill, PurchaseBillStatus } from "@/types/accounting";

export const STATUS_CLASS: Record<PurchaseBillStatus, string> = {
  DRAFT: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  PENDING_APPROVAL: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  POSTED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PARTIALLY_PAID: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PAID: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export const STATUS_LABEL: Record<PurchaseBillStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  POSTED: "Posted",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export function isPurchaseBillStatus(value: string): value is PurchaseBillStatus {
  return Object.prototype.hasOwnProperty.call(STATUS_LABEL, value);
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

export function formatDate(value: string | null | undefined): string {
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

export function formatNum(value: string | number): string {
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

export const ITEM_COLUMNS: DataTableColumn<BillItem>[] = [
  {
    key: "description",
    header: "Description",
    cell: (row) => <TruncatedText text={row.description} lines={2} className="text-sm text-foreground" />,
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

export const PAYMENT_COLUMNS: DataTableColumn<BillPayment>[] = [
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
