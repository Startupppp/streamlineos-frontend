import { cn } from "@/lib/utils";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "PAID" | null;

const STATUS_STYLES: Record<NonNullable<Status>, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

const STATUS_LABELS: Record<NonNullable<Status>, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

interface ReimbursementStatusBadgeProps {
  status: Status;
}

export function ReimbursementStatusBadge({ status }: ReimbursementStatusBadgeProps) {
  if (!status) return <span className="text-[10px] text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
