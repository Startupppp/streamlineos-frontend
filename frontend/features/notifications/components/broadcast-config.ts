import type { BroadcastStatus } from "@/types/notifications";

export const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "SENDING", label: "Sending" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

export const STATUS_CONFIG: Record<BroadcastStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "border-border text-muted-foreground" },
  SCHEDULED: { label: "Scheduled", className: "border-status-info-rule text-status-info-ink" },
  QUEUED: { label: "Queued", className: "border-status-info-rule text-status-info-ink" },
  SENDING: { label: "Sending", className: "border-status-warning-rule text-status-warning-ink" },
  SENT: { label: "Sent", className: "border-status-success-rule text-status-success-ink" },
  CANCELLED: { label: "Cancelled", className: "border-border text-muted-foreground" },
  FAILED: { label: "Failed", className: "border-status-danger-rule text-status-danger-ink" },
};

export function formatDate(value: Date | string | null): string {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}
