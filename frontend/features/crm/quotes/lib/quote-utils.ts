import type { QuoteStatus } from "@/types/crm/quotes";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export const STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SENT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  ACCEPTED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  EXPIRED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

export function isQuoteStatus(value: string): value is QuoteStatus {
  return value in STATUS_LABELS;
}

export function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
