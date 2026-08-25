"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import { usePayrollRuns } from "@/hooks/api/payroll/runs";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { formatMoney, formatMonth } from "@/features/payroll/shared";
import { ValidationPanel } from "@/features/payroll/payout/bank-transfers/validation-panel";
import { BatchesTable } from "@/features/payroll/payout/bank-transfers/batches-table";
import { BatchDetailSheet } from "@/features/payroll/payout/bank-transfers/batch-detail-sheet";
import { cn } from "@/lib/utils";
import type { PayrollRunStatus } from "@/types/payroll/runs";

const ELIGIBLE_STATUSES: PayrollRunStatus[] = ["APPROVED", "LOCKED", "PAID"];

const RUN_STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-status-info-surface text-status-info-ink",
  LOCKED: "bg-status-warning-surface text-status-warning-ink",
  PAID: "bg-status-success-surface text-status-success-ink",
};

export function BankTransfersContent() {
  const searchParams = useSearchParams();
  const rawRunId = searchParams.get("runId");
  const paramRunId = rawRunId ? parseInt(rawRunId, 10) : null;

  const canManage = useCan("payroll:bank:manage");

  const { data: policyData } = usePayrollPolicyCurrent();
  const policyCurrency = policyData?.policy?.currency ?? "INR";

  const { data: runsData } = usePayrollRuns({ limit: 10 });

  const eligibleRun = useMemo(() => {
    if (!runsData?.data) return null;
    return runsData.data.find((r) => ELIGIBLE_STATUSES.includes(r.status)) ?? null;
  }, [runsData?.data]);

  const run = paramRunId
    ? (runsData?.data.find((r) => r.id === paramRunId) ?? null)
    : eligibleRun;

  const runId = run?.id ?? null;

  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  function handleCloseBatchSheet() {
    setSelectedBatchId(null);
  }

  return (
    <>
      <PageWrapper title="Bank Transfers" subtitle="Generate and track salary payments">
        {!run || runId === null ? (
          <EmptyState
            illustration={<EmptyTransferIllustration />}
            title="No approved run found"
            description="Approve a payroll run first to generate payment batches"
            action={{ label: "Go to Runs", href: "/payroll/runs" }}
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col space-y-4">
            <div className="flex items-center gap-4 bg-muted/40 border border-border rounded-lg p-3 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                {formatMonth(run.month)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide",
                  RUN_STATUS_STYLES[run.status] ?? "bg-muted text-muted-foreground",
                )}
              >
                {run.status}
              </span>
              {run.netTotal && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground text-xs">Net Total</span>
                  <span className="font-semibold">{formatMoney(run.netTotal, policyCurrency)}</span>
                </div>
              )}
              {run.employeeCount != null && (
                <span className="text-sm text-muted-foreground">
                  {run.employeeCount} employees
                </span>
              )}
            </div>

            {canManage && <ValidationPanel runId={runId} />}

            <BatchesTable
              runId={runId}
              employeeCount={run.employeeCount}
              canManage={canManage}
              onSelectBatch={setSelectedBatchId}
            />
          </div>
        )}
      </PageWrapper>

      <BatchDetailSheet
        batchId={selectedBatchId}
        onClose={handleCloseBatchSheet}
        canManage={canManage}
      />
    </>
  );
}
