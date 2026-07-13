"use client";

import { Badge } from "@/components/ui/badge";
import type { HrPayrollInputStatus } from "@/hooks/api/payroll/payroll-inputs";

const STATUS_VARIANTS: Record<HrPayrollInputStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-muted text-muted-foreground border-border" },
  building: { label: "Building", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  built: { label: "Built", className: "bg-primary/10 text-foreground border-primary/20" },
  locked: { label: "Locked", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30" },
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
