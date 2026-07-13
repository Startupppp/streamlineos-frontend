"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { usePayoutBatches } from "@/hooks/api/payroll/payout-batches";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { formatMoney } from "@/features/payroll/shared";
import { GeneratePayoutDialog } from "./generate-payout-dialog";
import { MarkBatchSentDialog, MarkBatchPaidDialog } from "./mark-batch-dialogs";
import { cn } from "@/lib/utils";
import type { PayoutBatch, BankBatchStatus, BatchFormat } from "@/types/payroll";

const BATCH_STATUS_STYLES: Record<BankBatchStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  GENERATED: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  SENT: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

interface BatchesTableProps {
  runId: number;
  employeeCount: number | null;
  canManage: boolean;
  onSelectBatch: (batchId: number) => void;
}

export function BatchesTable({
  runId,
  employeeCount,
  canManage,
  onSelectBatch,
}: BatchesTableProps) {
  const { data: batches, isLoading } = usePayoutBatches(runId);
  const { data: policyData } = usePayrollPolicyCurrent();
  const policyCurrency = policyData?.policy?.currency ?? "INR";

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [format, setFormat] = useState<BatchFormat>("NEFT_CSV");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const [markSentBatchId, setMarkSentBatchId] = useState<number | null>(null);
  const [markPaidBatchId, setMarkPaidBatchId] = useState<number | null>(null);
  const [txnRef, setTxnRef] = useState("");

  function handleOpenGenerateDialog() {
    setIdempotencyKey(crypto.randomUUID());
    setFormat("NEFT_CSV");
    setFileUrl(null);
    setShowGenerateDialog(true);
  }

  function handleCloseGenerateDialog() {
    setShowGenerateDialog(false);
    setFileUrl(null);
  }

  function handleOpenMarkPaid(batchId: number) {
    setMarkPaidBatchId(batchId);
    setTxnRef("");
  }

  function handleCloseMarkPaid() {
    setMarkPaidBatchId(null);
    setTxnRef("");
  }

  const actionColumns: DataTableColumn<PayoutBatch>[] = canManage
    ? [
        {
          key: "actions",
          header: "",
          cell: (row) => (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {row.status === "GENERATED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setMarkSentBatchId(row.id)}
                >
                  Mark Sent
                </Button>
              )}
              {row.status === "SENT" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleOpenMarkPaid(row.id)}
                >
                  Mark Paid
                </Button>
              )}
            </div>
          ),
        },
      ]
    : [];

  const columns: DataTableColumn<PayoutBatch>[] = [
    {
      key: "batchNumber",
      header: "Batch #",
      cell: (row) => (
        <span className="font-mono text-xs font-medium">{row.batchNumber}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            BATCH_STATUS_STYLES[row.status],
          )}
        >
          {row.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "itemCount",
      header: "Items",
      cell: (row) => <span className="tabular-nums text-sm">{row.itemCount}</span>,
    },
    {
      key: "totalAmount",
      header: "Total",
      cell: (row) => (
        <span className="tabular-nums text-sm font-medium">
          {formatMoney(row.totalAmount, policyCurrency)}
        </span>
      ),
    },
    {
      key: "generatedAt",
      header: "Generated",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.generatedAt ? new Date(row.generatedAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    ...actionColumns,
  ];

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Payment Batches</h2>
          {canManage && (
            <Button size="sm" onClick={handleOpenGenerateDialog}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Generate Payout Batch
            </Button>
          )}
        </div>

        <DataTable
          data={batches ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          onRowClick={(row) => onSelectBatch(row.id)}
          emptyState={
            <EmptyState
              illustration={<EmptyTransferIllustration />}
              title="No payment batches yet"
              description={
                canManage ? "Generate the first batch to begin payouts" : undefined
              }
              action={
                canManage
                  ? { label: "Generate Payout Batch", onClick: handleOpenGenerateDialog }
                  : undefined
              }
              compact
            />
          }
        />
      </div>

      <GeneratePayoutDialog
        open={showGenerateDialog}
        onClose={handleCloseGenerateDialog}
        runId={runId}
        employeeCount={employeeCount}
        format={format}
        onFormatChange={setFormat}
        idempotencyKey={idempotencyKey}
        fileUrl={fileUrl}
        onFileUrl={setFileUrl}
      />

      <MarkBatchSentDialog
        batchId={markSentBatchId}
        runId={runId}
        onClose={() => setMarkSentBatchId(null)}
      />

      <MarkBatchPaidDialog
        batchId={markPaidBatchId}
        runId={runId}
        txnRef={txnRef}
        onTxnRefChange={setTxnRef}
        onClose={handleCloseMarkPaid}
      />
    </>
  );
}
