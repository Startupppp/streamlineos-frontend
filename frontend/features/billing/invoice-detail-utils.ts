import type { InvoiceStatus } from "@/types/invoice";

export const invoiceStatusBadge: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  ISSUED: {
    label: "Issued",
    className: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  PAID: {
    label: "Paid",
    className: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  },
  FAILED: {
    label: "Failed",
    className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
  VOIDED: {
    label: "Voided",
    className: "bg-muted text-muted-foreground border-border",
  },
  SENT: {
    label: "Sent",
    className: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  PARTIALLY_PAID: {
    label: "Partially paid",
    className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
};

export function formatInvoiceAmount(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
