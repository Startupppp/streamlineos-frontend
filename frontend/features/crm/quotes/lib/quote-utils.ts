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
