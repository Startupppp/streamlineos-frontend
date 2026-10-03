"use client";

import { ApprovalStagePanel, LockActions, SubmitApprovalAction } from "@/features/payroll/payout";
import { useCan } from "@/hooks/api/access";
import { StepNote, StepPanel } from "./step-panel";

const SUBMITTABLE = new Set(["PREVIEW_READY", "EXCEPTIONS_FOUND"]);

interface ApproveStepProps {
  runId: number;
  status: string;
  isCurrent: boolean;
}

export function ApproveStep({ runId, status, isCurrent }: ApproveStepProps) {
  const canSubmit = useCan("payroll:runs:update");
  const canLock = useCan("payroll:runs:manage");

  let cta = null;
  if (isCurrent && SUBMITTABLE.has(status)) {
    cta = canSubmit ? (
      <SubmitApprovalAction runId={runId} status={status} />
    ) : (
      <StepNote>Someone who can update payroll runs needs to submit this run.</StepNote>
    );
  } else if (isCurrent && status === "APPROVED") {
    cta = canLock ? (
      <LockActions runId={runId} status={status} />
    ) : (
      <StepNote>Someone who can manage payroll runs needs to lock this run.</StepNote>
    );
  }

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
