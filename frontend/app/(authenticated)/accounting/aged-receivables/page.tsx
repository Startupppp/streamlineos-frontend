"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useAgedReceivables } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AgedReceivablesRow } from "@/types/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatAmount(value: string): string {
  return Number(value).toFixed(2);
}

const agedReceivablesColumns: DataTableColumn<AgedReceivablesRow>[] = [
  {
    key: "clientName",
    header: "Customer",
    cell: (row) => (
      <Link href={"/accounting/customers/" + String(row.clientId)} className="text-primary hover:underline">
        {row.clientName}
      </Link>
    ),
  },
  {
    key: "current",
    header: "Current",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{formatAmount(row.current)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.current),
  },
  {
    key: "d1_30",
    header: "1–30 days",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{formatAmount(row.d1_30)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d1_30),
  },
  {
    key: "d31_60",
    header: "31–60 days",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{formatAmount(row.d31_60)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d31_60),
  },
  {
    key: "d61_90",
    header: "61–90 days",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{formatAmount(row.d61_90)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d61_90),
  },
  {
    key: "d91_plus",
    header: "90+ days",
    cell: (row) => <span className="tabular-nums text-rose-600 dark:text-rose-400 font-mono text-sm">{formatAmount(row.d91_plus)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d91_plus),
  },
  {
    key: "total",
    header: "Total",
    cell: (row) => <span className="tabular-nums font-medium font-mono text-sm">{formatAmount(row.total)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.total),
  },
];

export default function AgedReceivablesPage() {
  const [asOf, setAsOf] = useState<string>(todayIso());
  const query = useAgedReceivables(asOf);
  const report = query.data;

  function handleAsOfChange(value: string): void {
    setAsOf(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      title="Aged Receivables"
      subtitle="Outstanding customer balances grouped by days overdue."
      filters={
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <div className="flex flex-col gap-1">
            <label htmlFor="aged-asof" className="text-[11px] font-medium text-muted-foreground leading-none">As of</label>
            <DatePicker id="aged-asof" value={asOf ?? ""} onChange={handleAsOfChange} placeholder="Pick a date" className="w-full sm:w-[160px] h-8 text-sm" />
          </div>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {query.error ? (
          <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={report?.rows ?? []}
            columns={agedReceivablesColumns}
            getRowKey={(row) => row.clientId}
            isLoading={query.isLoading}
            emptyState={
              <EmptyState
                illustration={<EmptyExpensesIllustration />}
                title="No outstanding receivables"
                description={`No customer balances are overdue as of ${asOf}.`}
              />
            }
            footer={report ? (
              <div className="grid grid-cols-7 gap-2 text-xs font-semibold tabular-nums font-mono">
                <span>Total</span>
                <span className="text-right">{formatAmount(report.totals.current)}</span>
                <span className="text-right">{formatAmount(report.totals.d1_30)}</span>
                <span className="text-right">{formatAmount(report.totals.d31_60)}</span>
                <span className="text-right">{formatAmount(report.totals.d61_90)}</span>
                <span className="text-right text-rose-600 dark:text-rose-400">{formatAmount(report.totals.d91_plus)}</span>
                <span className="text-right">{formatAmount(report.totals.total)}</span>
              </div>
            ) : undefined}
          />
        )}
      </div>
    </PageWrapper>
  );
}
