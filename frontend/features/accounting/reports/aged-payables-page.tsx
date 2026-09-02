"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useAgedPayables } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AgedPayablesRow } from "@/types/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(value: string): string {
  return Number(value).toFixed(2);
}

const agedPayablesColumns: DataTableColumn<AgedPayablesRow>[] = [
  {
    key: "vendorName",
    header: "Vendor",
    cell: (row) => (
      <Link href={"/accounting/vendors/" + String(row.vendorId)} className="text-primary hover:underline">
        {row.vendorName}
      </Link>
    ),
  },
  {
    key: "current",
    header: "Current",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{fmt(row.current)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.current),
  },
  {
    key: "d1_30",
    header: "1–30 days",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{fmt(row.d1_30)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d1_30),
  },
  {
    key: "d31_60",
    header: "31–60 days",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{fmt(row.d31_60)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d31_60),
  },
  {
    key: "d61_90",
    header: "61–90 days",
    cell: (row) => <span className="tabular-nums font-mono text-sm">{fmt(row.d61_90)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d61_90),
  },
  {
    key: "d91_plus",
    header: "90+ days",
    cell: (row) => <span className="tabular-nums text-status-danger-ink font-mono text-sm">{fmt(row.d91_plus)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.d91_plus),
  },
  {
    key: "total",
    header: "Total",
    cell: (row) => <span className="tabular-nums font-medium font-mono text-sm">{fmt(row.total)}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.total),
  },
];

export function AgedPayablesPage() {
  const [asOf, setAsOf] = useState<string>(todayIso());
  const query = useAgedPayables(asOf);
  const report = query.data;

  function handleAsOfChange(value: string): void {
    setAsOf(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      title="Aged Payables"
      subtitle="Outstanding vendor balances grouped by days overdue."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="flex flex-col gap-1">
            <label htmlFor="aged-payables-asof" className="text-dense font-medium text-muted-foreground leading-none">
              As of
            </label>
            <DatePicker
              id="aged-payables-asof"
              value={asOf ?? ""}
              onChange={handleAsOfChange}
              placeholder="Pick a date"
              className="w-[160px]"
            />
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
            columns={agedPayablesColumns}
            getRowKey={(row) => row.vendorId}
            isLoading={query.isLoading}
            emptyState={
              <EmptyState
                illustration={<EmptyExpensesIllustration />}
                title="No outstanding payables"
                description={`No vendor balances are overdue as of ${asOf}.`}
              />
            }
            footer={
              report ? (
                <div className="grid grid-cols-7 gap-2 text-xs font-semibold tabular-nums font-mono">
                  <span>Total</span>
                  <span className="text-right">{fmt(report.totals.current)}</span>
                  <span className="text-right">{fmt(report.totals.d1_30)}</span>
                  <span className="text-right">{fmt(report.totals.d31_60)}</span>
                  <span className="text-right">{fmt(report.totals.d61_90)}</span>
                  <span className="text-right text-status-danger-ink">{fmt(report.totals.d91_plus)}</span>
                  <span className="text-right">{fmt(report.totals.total)}</span>
                </div>
              ) : undefined
            }
          />
        )}
      </div>
    </PageWrapper>
  );
}
