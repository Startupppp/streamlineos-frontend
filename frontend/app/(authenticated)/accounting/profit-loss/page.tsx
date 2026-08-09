"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { useProfitLoss } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ProfitLossRow } from "@/types/accounting";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

function lastOfMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;
}

const profitLossColumns: DataTableColumn<ProfitLossRow>[] = [
  {
    key: "code",
    header: "Code",
    cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.code}</span>,
    className: "w-20",
  },
  {
    key: "name",
    header: "Account",
    cell: (row) => <span className="text-sm">{row.name}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    cell: (row) => <span className="text-sm text-right tabular-nums font-medium font-mono block">{row.amount}</span>,
    className: "text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.amount),
  },
];

interface ReportCardProps {
  title: string;
  rows: ProfitLossRow[];
  totalLabel: string;
  totalAmount: string;
}

function ReportCard({ title, rows, totalLabel, totalAmount }: ReportCardProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/40">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <DataTable
        data={rows}
        columns={profitLossColumns}
        getRowKey={(row) => row.accountId}
        className="border-0 rounded-none"
        emptyState={<p className="py-6 text-center text-sm text-muted-foreground">No {title.toLowerCase()} accounts for this range.</p>}
        footer={<div className="flex items-center justify-between text-sm font-semibold"><span>{totalLabel}</span><span className="tabular-nums font-bold text-base font-mono">{totalAmount}</span></div>}
      />
    </div>
  );
}

export default function ProfitLossPage() {
  const [from, setFrom] = useState<string>(firstOfMonth());
  const [to, setTo] = useState<string>(lastOfMonth());

  const query = useProfitLoss(from, to);

  function handleFromChange(value: string): void {
    setFrom(value);
  }

  function handleToChange(value: string): void {
    setTo(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const pnl = query.data;
  const income = pnl?.income ?? [];
  const expense = pnl?.expense ?? [];
  const hasAnyRows = income.length > 0 || expense.length > 0;

  return (
    <PageWrapper
      title="Profit & Loss"
      subtitle="Income minus expense for the selected range."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pnl-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="pnl-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pnl-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="pnl-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
        </div>
      }
    >
      {query.isLoading ? (
          <div className="flex flex-1 min-h-0 flex-col">
            <LoadingState variant="table" rows={12} />
          </div>
        ) : query.error ? (
          <div className="flex flex-1 min-h-0 flex-col">
            <ErrorState
              title="Failed to load profit & loss"
              description={getErrorMessage(query.error)}
              onRetry={handleRetry}
            />
          </div>
        ) : !pnl || !hasAnyRows ? (
          <div className="flex flex-1 min-h-0 flex-col">
            <EmptyState
              illustration={<EmptyTimeIllustration />}
              title="No income or expense activity for this range"
              description="Pick a different date range or post entries to see this report populate."
            />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ReportCard
                title="Income"
                rows={income}
                totalLabel="Total Income"
                totalAmount={pnl.totalIncome}
              />
              <ReportCard
                title="Expense"
                rows={expense}
                totalLabel="Total Expense"
                totalAmount={pnl.totalExpense}
              />
            </div>
            <div className="rounded-lg border border-border px-4 py-3 flex items-center justify-between gap-4 bg-muted/40">
              <span className="text-sm font-semibold text-foreground">
                Net income
              </span>
              <span className="font-mono tabular-nums text-base font-bold text-foreground">
                {pnl.netIncome}
              </span>
            </div>
          </div>
        )}
    </PageWrapper>
  );
}
