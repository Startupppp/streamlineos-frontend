import { cn } from "@/lib/utils";
import type { TaxWindowStatus } from "@/types/payroll/reports";

const STATUS_CONFIG: Record<TaxWindowStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  OPEN: {
    label: "Open",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  LOCKED: {
    label: "Locked",
    className: "bg-red-50 text-red-700 border-red-200",
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
