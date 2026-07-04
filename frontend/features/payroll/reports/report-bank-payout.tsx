"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePayrollBankPayout } from "@/hooks/api/payroll/reports";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { cn } from "@/lib/utils";
import type { BankPayoutBatch, BankPayoutItem } from "@/types/payroll/reports";

interface ReportBankPayoutProps {
  month: string;
}

const BATCH_STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  PROCESSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

const ITEM_COLUMNS: DataTableColumn<BankPayoutItem>[] = [
  {
    key: "userName",
    header: "Employee",
    cell: (row) => <span className="text-[11px] font-medium">{row.userName}</span>,
  },
  {
    key: "accountMasked",
    header: "Account",
    cell: (row) => (
      <span className="font-mono text-[11px] text-muted-foreground">{row.accountMasked}</span>
    ),
  },
  {
    key: "ifsc",
    header: "IFSC",
    cell: (row) => (
      <span className="font-mono text-[11px] text-muted-foreground">{row.ifsc}</span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.amount)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
          BATCH_STATUS_CLASS[row.status] ?? "bg-slate-100 text-slate-600 border-slate-200",
        )}
      >
        {row.status}
      </span>
    ),
  },
];

function BatchCard({ batch }: { batch: BankPayoutBatch }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 py-3 flex-row items-center gap-3 border-b bg-muted/30">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="text-[12px] font-semibold text-foreground">
            Batch #{batch.batchNumber}
          </span>
          <span className="text-[11px] text-muted-foreground">{batch.format}</span>
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
              BATCH_STATUS_CLASS[batch.status] ?? "bg-slate-100 text-slate-600 border-slate-200",
            )}
          >
            {batch.status}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">{batch.itemCount} employees</p>
            <p className="text-[12px] font-mono font-semibold tabular-nums">
              {formatMoney(batch.totalAmount)}
            </p>
          </div>
          {batch.generatedAt && (
            <p className="text-[10px] text-muted-foreground">
              {new Date(batch.generatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          data={batch.items}
          columns={ITEM_COLUMNS}
          getRowKey={(row) => `${row.userName}-${row.accountMasked}`}
          emptyState={
            <EmptyState compact title="No items in this batch" />
          }
        />
      </CardContent>
    </Card>
  );
}

export function ReportBankPayout({ month }: ReportBankPayoutProps) {
  const { data, isLoading } = usePayrollBankPayout(month);

  const batches = useMemo(() => data?.batches ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!batches.length) {
    return (
      <EmptyState
        illustration={<EmptyReportIllustration />}
        title="No bank payout batches"
        description="Bank payout batches will appear here once payroll is approved and processed."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {batches.map((batch) => (
        <BatchCard key={batch.batchNumber} batch={batch} />
      ))}
    </div>
  );
}
