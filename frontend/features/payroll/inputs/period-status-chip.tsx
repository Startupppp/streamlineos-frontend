"use client";

import { Badge } from "@/components/ui/badge";
import type { HrPayrollInputStatus } from "@/hooks/api/payroll/payroll-inputs";

const STATUS_VARIANTS: Record<HrPayrollInputStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-muted text-muted-foreground border-border" },
  building: { label: "Building", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  built: { label: "Built", className: "bg-primary/10 text-foreground border-primary/20" },
  locked: { label: "Locked", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
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
