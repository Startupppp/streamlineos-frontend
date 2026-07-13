import { cn } from "@/lib/utils";
import type { BankTxnStatus } from "@/hooks/api/accounting/banking";

const STATUS_CONFIG: Record<
  BankTxnStatus,
  { label: string; className: string }
> = {
  UNMATCHED: {
    label: "Unmatched",
    className: "bg-muted text-muted-foreground border-border",
  },
  SUGGESTED: {
    label: "Suggested",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  MATCHED: {
    label: "Matched",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  RECONCILED: {
    label: "Reconciled",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  IGNORED: {
    label: "Ignored",
    className: "bg-muted text-muted-foreground border-border",
  },
};

interface BankTxnStatusBadgeProps {
  status: BankTxnStatus;
  size?: "row" | "chip";
}

export function BankTxnStatusBadge({ status, size = "row" }: BankTxnStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium tabular-nums",
        size === "chip" ? "px-2 py-1 text-xs" : "px-1.5 py-0.5 text-[11px]",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
