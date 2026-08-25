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
    className: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  MATCHED: {
    label: "Matched",
    className: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  RECONCILED: {
    label: "Reconciled",
    className: "bg-status-success-surface text-status-success-ink border-status-success-rule",
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
        size === "chip" ? "px-2 py-1 text-xs" : "px-1.5 py-0.5 text-dense",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
