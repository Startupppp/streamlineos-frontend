import { cn } from "@/lib/utils";
import type { TaxWindowStatus } from "@/types/payroll/reports";

const STATUS_CONFIG: Record<TaxWindowStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
  },
  OPEN: {
    label: "Open",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border",
  },
  LOCKED: {
    label: "Locked",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  },
};

export function TaxWindowStatusBadge({ status }: { status: TaxWindowStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
