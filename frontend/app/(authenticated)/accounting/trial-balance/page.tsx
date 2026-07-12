"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { useTrialBalance } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TrialBalanceRow } from "@/types/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const columns: DataTableColumn<TrialBalanceRow>[] = [
  {
    key: "code",
    header: "Code",
    cell: (row) => <span className="font-mono text-xs text-foreground">{row.code}</span>,
    className: "w-[120px]",
  },
  {
    key: "name",
    header: "Account",
    cell: (row) => <span className="text-sm text-foreground">{row.name}</span>,
  },
  {
    key: "accountType",
    header: "Type",
    cell: (row) => (
      <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
        {row.accountType}
      </span>
    ),
    className: "w-[140px]",
  },
  {
    key: "debit",
    header: "Debit",
    cell: (row) => <span className="tabular-nums font-mono">{row.debit}</span>,
    className: "text-right w-[140px]",
    sortable: true,
    sortValue: (row) => parseFloat(row.debit),
  },
  {
    key: "credit",
    header: "Credit",
    cell: (row) => <span className="tabular-nums font-mono">{row.credit}</span>,
    className: "text-right w-[140px]",
    sortable: true,
    sortValue: (row) => parseFloat(row.credit),
  },
  {
    key: "balance",
    header: "Balance",
    cell: (row) => <span className="tabular-nums font-medium font-mono">{row.balance}</span>,
    className: "text-right w-[140px]",
    sortable: true,
    sortValue: (row) => parseFloat(row.balance),
  },
];

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState<string>(todayIso());

  const query = useTrialBalance(asOf);

  function handleAsOfChange(value: string): void {
    setAsOf(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const tb = query.data;
  const rows = tb?.rows ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="Trial Balance"
      subtitle="Ledger balances as of a chosen date."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="tb-as-of"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              As of
            </label>
            <DatePicker
              id="tb-as-of"
              value={asOf ?? ""}
              onChange={handleAsOfChange}
              placeholder="Pick a date"
              className="w-full sm:w-[160px] h-8 text-sm"
            />
          </div>
          {tb ? (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-muted-foreground leading-none">
                Status
              </span>
              {tb.balanced ? (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 text-xs font-medium border border-emerald-500/20">
                  Balanced ✓
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                  Imbalanced
                </span>
              )}
            </div>
          ) : null}
        </div>
      }
    >
      {query.error ? (
        <ErrorState
          title="Failed to load trial balance"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.accountId}
          isLoading={query.isLoading}
          emptyState={
            <EmptyState
              illustration={<EmptyTimeIllustration />}
              title="No posted entries for this date"
              description="Post journal entries with a date on or before the selected date to populate this report."
            />
          }
          footer={
            tb ? (
              <div className="flex gap-8 justify-end text-xs font-semibold tabular-nums font-mono">
                <span className="mr-auto">Total</span>
                <span>{tb.totalDebit}</span>
                <span>{tb.totalCredit}</span>
              </div>
            ) : undefined
          }
          minWidth="640px"
        />
      )}
    </PageWrapper>
  );
}
