export type DocStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";

export function docStatusBadgeClass(status: DocStatus): string {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800";
  if (status === "SUBMITTED") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800";
  if (status === "RE_UPLOAD_REQUESTED") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800";
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
