"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { useProfitLoss } from "@/hooks/api/accounting";
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

interface ReportCardProps {
  title: string;
  rows: ProfitLossRow[];
  totalLabel: string;
  totalAmount: string;
}

function ReportCard({ title, rows, totalLabel, totalAmount }: ReportCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-3">
      <h3 className="text-sm font-semibold border-b border-border pb-2 mb-2">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} accounts for this range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[320px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 w-20">
                  Code
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Account
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 text-right">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.accountId}
                  className={`border-0 ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/20"}`}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground px-2 py-1.5 w-20">
                    {row.code}
                  </TableCell>
                  <TableCell className="text-sm px-2 py-1.5">{row.name}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums font-medium font-mono px-2 py-1.5">
                    {row.amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-sm font-semibold px-2 py-2"
                >
                  {totalLabel}
                </TableCell>
                <TableCell className="text-right tabular-nums font-bold text-base px-2 py-2">
                  {totalAmount}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function ProfitLossPage() {
  const [from, setFrom] = useState<string>(firstOfMonth());
  const [to, setTo] = useState<string>(lastOfMonth());

  const query = useProfitLoss(from, to);

  function handleFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setFrom(event.target.value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>): void {
    setTo(event.target.value);
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
      eyebrow="Accounting · Reports"
      title="Profit & Loss"
      subtitle="Income minus expense for the selected range."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pnl-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <Input
              id="pnl-from"
              type="date"
              value={from}
              onChange={handleFromChange}
              className="w-full sm:w-[160px] h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pnl-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <Input
              id="pnl-to"
              type="date"
              value={to}
              onChange={handleToChange}
              className="w-full sm:w-[160px] h-8 text-sm"
            />
          </div>
        </div>
      }
    >
      {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load profit & loss"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : !pnl || !hasAnyRows ? (
          <EmptyState
            illustration={<EmptyTimeIllustration />}
            title="No income or expense activity for this range"
            description="Pick a different date range or post entries to see this report populate."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
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
