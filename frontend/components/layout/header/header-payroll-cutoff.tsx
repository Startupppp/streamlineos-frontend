"use client";

import { CutoffChip } from "@/components/shared/cutoff-chip";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";

export function HeaderPayrollCutoff() {
  const { cutoff } = usePayrollCutoff();

  return (
    <CutoffChip
      cutoff={cutoff}
      href="/payroll/readiness"
      className="hidden shrink-0 sm:inline-flex"
    />
  );
}
