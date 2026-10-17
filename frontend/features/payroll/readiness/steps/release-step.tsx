"use client";

import Link from "next/link";
import { PublishPayslipsAction } from "@/features/payroll/payout";
import { useCan } from "@/hooks/api/access";
import { StepNote, StepPanel } from "./step-panel";

interface ReleaseStepProps {
  runId: number;
  status: string;
  heldCount: number | null;
  isCurrent: boolean;
}

function heldLine(heldCount: number | null): string {
  if (heldCount === null) return "The hold count is not shown because the roster is larger than one page.";
  if (heldCount === 0) return "Nobody is on hold.";
  return `${heldCount} ${heldCount === 1 ? "employee is" : "employees are"} on hold and will not get a payslip until released.`;
}

export function ReleaseStep({ runId, status, heldCount, isCurrent }: ReleaseStepProps) {
  const canPublish = useCan("payroll:payslips:manage");

  const cta = isCurrent ? (
    canPublish ? (
      <PublishPayslipsAction runId={runId} status={status} />
    ) : (
      <StepNote>Someone who can manage payslips needs to release them.</StepNote>
    )
  ) : null;

  return (
    <StepPanel title="Release / Hold" cta={cta}>
      {status === "PAYSLIPS_PUBLISHED" || status === "CLOSED" ? (
        <StepNote>Payslips are released. This month is closed for payroll.</StepNote>
      ) : null}
      <StepNote>
        {heldLine(heldCount)}{" "}
        <Link href={`/payroll/runs/${runId}?tab=employees`} className="underline underline-offset-2">
          Review holds
        </Link>
      </StepNote>
    </StepPanel>
  );
}
