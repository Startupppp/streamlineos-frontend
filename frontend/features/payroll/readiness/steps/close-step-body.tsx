"use client";

import type { CloseStepKey } from "../close-steps";
import type { CloseMonth } from "../use-close-month";
import { ApproveStep } from "./approve-step";
import { ChecklistStep } from "./checklist-step";
import { CompareStep } from "./compare-step";
import { OpenMonthStep } from "./open-month-step";
import { PayStep } from "./pay-step";
import { ProcessStep } from "./process-step";
import { ReleaseStep } from "./release-step";

interface CloseStepBodyProps {
  stepKey: CloseStepKey;
  month: string;
  close: CloseMonth;
  onRunCreated: () => void;
}

export function CloseStepBody({ stepKey, month, close, onRunCreated }: CloseStepBodyProps) {
  const readiness = close.readiness.data;
  if (!readiness) return null;
  const isCurrent = close.steps.find((step) => step.key === stepKey)?.state === "current";
  const runId = close.runId;
  const status = close.runStatus;

  if (stepKey === "open") {
    return <OpenMonthStep month={month} readiness={readiness} isCurrent={isCurrent} onCreated={onRunCreated} />;
  }
  if (stepKey === "checklist") {
    return (
      <ChecklistStep
        readiness={readiness}
        rows={close.rows}
        runBlockers={close.runBlockers.data}
        runId={runId}
        headline={close.summary.headline}
        isCurrent={isCurrent}
      />
    );
  }
  if (runId === null || status === null) return null;
  if (stepKey === "process") return <ProcessStep run={close.run} isCurrent={isCurrent} />;
  if (stepKey === "compare") {
    return <CompareStep runId={runId} headcount={close.run?.employeeCount ?? null} variance={close.variance} />;
  }
  if (stepKey === "approve") return <ApproveStep runId={runId} status={status} isCurrent={isCurrent} />;
  if (stepKey === "pay") return <PayStep runId={runId} isCurrent={isCurrent} />;
  return <ReleaseStep runId={runId} status={status} heldCount={close.heldCount} isCurrent={isCurrent} />;
}
