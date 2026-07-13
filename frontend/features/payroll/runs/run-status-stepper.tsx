"use client";

import { cn } from "@/lib/utils";
import type { PayrollRunStatus } from "@/types/payroll/runs";

const STEPS: { status: PayrollRunStatus; label: string }[] = [
  { status: "DRAFT", label: "Prepare" },
  { status: "PREVIEW_READY", label: "Preview" },
  { status: "PENDING_APPROVAL", label: "Approve" },
  { status: "LOCKED", label: "Lock" },
  { status: "PAID", label: "Pay" },
  { status: "PAYSLIPS_PUBLISHED", label: "Publish" },
  { status: "CLOSED", label: "Close" },
];

const STATUS_ORDER: Record<PayrollRunStatus, number> = {
  PREPARING: 1,
  DRAFT: 1,
  EXCEPTIONS_FOUND: 1,
  PREVIEW_READY: 2,
  PENDING_APPROVAL: 3,
  APPROVED: 3,
  LOCKED: 4,
  PAID: 5,
  PAYSLIPS_PUBLISHED: 6,
  CLOSED: 7,
  REOPENED: 1,
};

interface RunStatusStepperProps {
  status: PayrollRunStatus;
  className?: string;
}

export function RunStatusStepper({ status, className }: RunStatusStepperProps) {
  const currentOrder = STATUS_ORDER[status];

  return (
    <div className={cn("flex items-center gap-0 overflow-x-auto", className)}>
      {STEPS.map((step, idx) => {
        const stepOrder = STATUS_ORDER[step.status];
        const isDone = stepOrder < currentOrder;
        const isCurrent = stepOrder === currentOrder;
        return (
          <div key={step.status} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  "h-px w-6 shrink-0",
                  isDone ? "bg-emerald-400" : "bg-border",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  isDone && "bg-emerald-500",
                  isCurrent && "bg-primary ring-2 ring-primary/20",
                  !isDone && !isCurrent && "bg-border",
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-medium whitespace-nowrap",
                  isDone && "text-emerald-600",
                  isCurrent && "text-primary",
                  !isDone && !isCurrent && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
