"use client";

import { usePayrollReadiness } from "@/hooks/api/payroll/readiness";
import type { PayrollCutoff } from "@/lib/hrms/payroll-cutoff";

export function currentPayrollMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export interface PayrollCutoffResult {
  cutoff: PayrollCutoff | null;
  month: string;
  isLoading: boolean;
}

export function usePayrollCutoff(): PayrollCutoffResult {
  const month = currentPayrollMonth();
  const { data, isLoading } = usePayrollReadiness(month);
  return { cutoff: data?.cutoff ?? null, month, isLoading };
}
