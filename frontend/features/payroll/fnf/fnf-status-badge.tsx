import { cn } from "@/lib/utils";
import type { FnfStatus } from "@/types/payroll";

const STATUS_CONFIG: Record<FnfStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  HR_REVIEW: {
    label: "HR Review",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  FINANCE_REVIEW: {
    label: "Finance Review",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PAID: {
    label: "Paid",
    className: "bg-green-50 text-green-700 border-green-200",
  },
};

interface FnfStatusBadgeProps {
  status: FnfStatus;
}

export function FnfStatusBadge({ status }: FnfStatusBadgeProps) {
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
