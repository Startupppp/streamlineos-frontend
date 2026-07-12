import { cn } from "@/lib/utils";
import type { BankTxnStatus } from "@/hooks/api/accounting/banking";

const STATUS_CONFIG: Record<
  BankTxnStatus,
  { label: string; className: string }
> = {
  UNMATCHED: {
    label: "Unmatched",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  SUGGESTED: {
    label: "Suggested",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  MATCHED: {
    label: "Matched",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  RECONCILED: {
    label: "Reconciled",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  IGNORED: {
    label: "Ignored",
    className: "bg-slate-50 text-slate-500 border-slate-200",
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
