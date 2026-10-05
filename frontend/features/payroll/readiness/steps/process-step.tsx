"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { RunActionsSlot } from "@/features/payroll/runs/run-actions-slot";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { useCan } from "@/hooks/api/access";
import type { PayrollRun } from "@/types/payroll/runs";
import { StepNote, StepPanel } from "./step-panel";

interface ProcessStepProps {
  run: PayrollRun | null;
  isCurrent: boolean;
}

export function ProcessStep({ run, isCurrent }: ProcessStepProps) {
  const canManage = useCan("payroll:runs:manage");

  if (run === null) {
    return (
      <StepPanel title="Process">
        <Skeleton className="h-16 rounded-lg" />
      </StepPanel>
    );
  }

  const cta = isCurrent ? (
    canManage ? (
      <RunActionsSlot run={run} />
    ) : (
      <StepNote>Someone who can manage payroll runs needs to process this month.</StepNote>
    )
  ) : null;

  return (
    <StepPanel title="Process" cta={cta}>
      {run.status === "PREPARING" ? (
        <StepNote>Generate calculates every employee in the run from this month&apos;s inputs and salaries.</StepNote>
      ) : isCurrent ? (
        <StepNote>Recalculate replaces the current preview with figures from the latest inputs.</StepNote>
      ) : (
        <StepNote>
          Calculated for {run.employeeCount ?? 0} employees. Gross {formatMoney(run.grossTotal)}, deductions{" "}
          {formatMoney(run.deductionTotal)}, net {formatMoney(run.netTotal)}.
        </StepNote>
      )}
    </StepPanel>
  );
}
