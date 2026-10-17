"use client";

import type { ReactNode } from "react";
import { ApprovalStagePanel, LockActions, SubmitApprovalAction } from "@/features/payroll/payout";
import { useCan } from "@/hooks/api/access";
import { StepNote, StepPanel } from "./step-panel";

const SUBMITTABLE = new Set(["PREVIEW_READY", "EXCEPTIONS_FOUND"]);

interface ApproveStepProps {
  runId: number;
  status: string;
  isCurrent: boolean;
}

function resolveApproveCta(
  isCurrent: boolean,
  status: string,
  canSubmit: boolean,
  canLock: boolean,
  runId: number,
): ReactNode {
  if (isCurrent && SUBMITTABLE.has(status)) {
    return canSubmit ? (
      <SubmitApprovalAction runId={runId} status={status} />
    ) : (
      <StepNote>Someone who can update payroll runs needs to submit this run.</StepNote>
    );
  }
  if (isCurrent && status === "APPROVED") {
    return canLock ? (
      <LockActions runId={runId} status={status} />
    ) : (
      <StepNote>Someone who can manage payroll runs needs to lock this run.</StepNote>
    );
  }
  return null;
}

export function ApproveStep({ runId, status, isCurrent }: ApproveStepProps) {
  const canSubmit = useCan("payroll:runs:update");
  const canLock = useCan("payroll:runs:manage");

  const cta = resolveApproveCta(isCurrent, status, canSubmit, canLock, runId);

  return (
    <StepPanel title="Approve & lock" cta={cta}>
      {SUBMITTABLE.has(status) ? (
        <StepNote>Submitting sends the run through the approval chain. It locks once every stage approves.</StepNote>
      ) : status === "APPROVED" ? (
        <StepNote>Every stage approved. Locking freezes the calculation so it can be paid.</StepNote>
      ) : null}
      <ApprovalStagePanel runId={runId} status={status} />
    </StepPanel>
  );
}
