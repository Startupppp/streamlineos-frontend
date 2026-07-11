"use client";

import { Badge } from "@/components/ui/badge";
import type { HrPayrollInputStatus } from "@/hooks/api/payroll/payroll-inputs";

const STATUS_VARIANTS: Record<HrPayrollInputStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-slate-100 text-slate-700 border-slate-200" },
  building: { label: "Building", className: "bg-amber-50 text-amber-700 border-amber-200" },
  built: { label: "Built", className: "bg-blue-50 text-blue-700 border-blue-200" },
  locked: { label: "Locked", className: "bg-green-50 text-green-700 border-green-200" },
};

interface PeriodStatusChipProps {
  status: HrPayrollInputStatus;
}

export function PeriodStatusChip({ status }: PeriodStatusChipProps) {
  const config = STATUS_VARIANTS[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
