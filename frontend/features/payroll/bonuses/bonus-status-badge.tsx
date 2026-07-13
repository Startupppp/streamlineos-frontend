import { cn } from "@/lib/utils";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

const STATUS_STYLES: Record<Status, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  REJECTED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  PAID: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
};

const STATUS_LABELS: Record<Status, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

interface BonusStatusBadgeProps {
  status: string;
}

export function BonusStatusBadge({ status }: BonusStatusBadgeProps) {
  const key = status as Status;
  const style = STATUS_STYLES[key] ?? "bg-muted text-muted-foreground border-border";
  const label = STATUS_LABELS[key] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
        style,
      )}
    >
      {label}
    </span>
  );
}
