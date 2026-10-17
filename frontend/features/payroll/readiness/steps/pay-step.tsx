"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { usePayoutBatches } from "@/hooks/api/payroll/payout-batches";
import { StepNote, StepPanel } from "./step-panel";

interface PayStepProps {
  runId: number;
  isCurrent: boolean;
}

function batchLine(count: number, statuses: string): string {
  return `${count} payout batch${count === 1 ? "" : "es"} · ${statuses}`;
}

export function PayStep({ runId, isCurrent }: PayStepProps) {
  const canPay = useCan("payroll:bank:manage");
  const batches = usePayoutBatches(runId);
  const rows = batches.data?.data ?? [];
  const href = `/payroll/bank-transfers?runId=${runId}`;

  const cta = isCurrent ? (
    canPay ? (
      <Button size="sm" className="min-h-11 sm:min-h-9" asChild>
        <Link href={href}>{rows.length === 0 ? "Create payout batch" : "Open bank transfers"}</Link>
      </Button>
    ) : (
      <StepNote>Someone who can manage bank transfers needs to pay this run.</StepNote>
    )
  ) : null;

  return (
    <StepPanel title="Pay" cta={cta}>
      {!canPay ? (
        <StepNote>Payout batches are visible to people who manage bank transfers.</StepNote>
      ) : batches.isLoading ? (
        <StepNote>Loading payout batches…</StepNote>
      ) : batches.isError ? (
        <StepNote>Payout batches could not be loaded. Open bank transfers to check them.</StepNote>
      ) : rows.length === 0 ? (
        <StepNote>No payout batch exists for this run yet. Create one in bank transfers, send the file, then mark it paid.</StepNote>
      ) : (
        <StepNote>
          {batchLine(
            rows.length,
            [...new Set(rows.map((row) => row.status.replace(/_/g, " ").toLowerCase()))].join(", "),
          )}
          {batches.data?.pagination.hasMore ? " (first page only)" : ""}
        </StepNote>
      )}
    </StepPanel>
  );
}
