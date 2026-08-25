export type DocStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";

export function docStatusBadgeClass(status: DocStatus): string {
  if (status === "APPROVED") return "bg-status-success-surface text-status-success-ink border-status-success-rule";
  if (status === "SUBMITTED") return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
  if (status === "REJECTED") return "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";
  if (status === "RE_UPLOAD_REQUESTED") return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
  return "bg-muted text-muted-foreground border-border";
}

export function docStatusLabel(status: DocStatus): string {
  const labels: Record<DocStatus, string> = {
    APPROVED: "Approved",
    SUBMITTED: "Under Review",
    REJECTED: "Rejected",
    RE_UPLOAD_REQUESTED: "Re-upload Required",
    PENDING: "Pending",
  };
  return labels[status];
}

export function canUpload(status: DocStatus | undefined): boolean {
  return !status || status === "PENDING" || status === "RE_UPLOAD_REQUESTED" || status === "REJECTED";
}
