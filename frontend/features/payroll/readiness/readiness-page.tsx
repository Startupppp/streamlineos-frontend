"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMonth } from "@/features/payroll/shared/payroll-format";
import { usePageState } from "@/hooks/api/use-page-state";
import { currentPayrollMonth } from "@/hooks/api/payroll/payroll-cutoff";
import { formatDateTime } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { currentStepKey, type CloseStepKey } from "./close-steps";
import { CloseRail } from "./steps/close-rail";
import { CloseStepBody } from "./steps/close-step-body";
import { useCloseMonth } from "./use-close-month";

interface PickedStep {
  key: CloseStepKey;
  whileCurrent: CloseStepKey | null;
}

function CloseSkeleton() {
  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-4">
      <Skeleton className="h-80 rounded-xl lg:col-span-1" />
      <Skeleton className="h-80 rounded-xl lg:col-span-3" />
    </div>
  );
}

export function PayrollReadinessPage() {
  const [month, setMonth] = useState(currentPayrollMonth);
  const [picked, setPicked] = useState<PickedStep | null>(null);
  const close = useCloseMonth(month);
  const { readiness, runBlockers, roster } = close;

  const pageState = usePageState({
    permission: "payroll:runs:view",
    module: "payroll",
    isLoading: close.isLoading,
    isError: close.hardError,
    error: readiness.error,
  });

  const current = currentStepKey(close.steps);
  const pickedStep = picked && picked.whileCurrent === current ? close.steps.find((step) => step.key === picked.key) : undefined;
  const openKey: CloseStepKey = pickedStep && pickedStep.state !== "locked" ? pickedStep.key : (current ?? "release");

  const handleRetry = useCallback(() => {
    void readiness.refetch();
    void runBlockers.refetch();
    void roster.refetch();
  }, [readiness, runBlockers, roster]);

  const handleMonthChange = useCallback((next: string) => {
    setMonth(next);
    setPicked(null);
  }, []);

  const handleOpenStep = useCallback(
    (key: CloseStepKey) => {
      setPicked({ key, whileCurrent: current });
    },
    [current],
  );

  const handleRunCreated = useCallback(() => {
    void readiness.refetch();
  }, [readiness]);

  const staleTone = statusToneClasses("warning");

  return (
    <PageWrapper
      variant="display"
      title="Close payroll"
      subtitle={formatMonth(month)}
      actions={<MonthPicker value={month} onChange={handleMonthChange} yearRange={[-2, 0]} className="w-44" />}
    >
      <PageState resolution={pageState} loading={<CloseSkeleton />} onRetry={handleRetry} className="flex-1">
        {close.setup ? (
          <EmptyState
            illustrationPreset="calendar"
            title="Payroll is not set up yet"
            description="Set up a payroll policy before closing a month. Readiness and runs measure against it."
            action={{ label: close.setup.label, href: close.setup.href }}
          />
        ) : readiness.data ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {close.isStale ? (
              <div
                role="status"
                aria-label="Readiness is out of date"
                className={cn("flex items-start gap-2 rounded-lg border p-3", staleTone.surface, staleTone.rule)}
              >
                <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", staleTone.ink)} aria-hidden />
                <p className={cn("text-dense leading-snug", staleTone.inkStrong)}>
                  This refresh failed, so the checklist is out of date. Last good read{" "}
                  {readiness.dataUpdatedAt ? formatDateTime(new Date(readiness.dataUpdatedAt).toISOString()) : "unknown"}.
                </p>
              </div>
            ) : null}
            <CloseRail
              steps={close.steps}
              openKey={openKey}
              summaries={close.summaries}
              onOpen={handleOpenStep}
              stage={<CloseStepBody stepKey={openKey} month={month} close={close} onRunCreated={handleRunCreated} />}
            />
          </div>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
