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
import { useProfitLoss } from "@/lib/api/hooks/accounting";
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
  tint: "income" | "expense";
  rows: ProfitLossRow[];
  totalLabel: string;
  totalAmount: string;
}

function ReportCard({ title, tint, rows, totalLabel, totalAmount }: ReportCardProps) {
  const tintClass =
    tint === "income"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200/70"
      : "bg-rose-50 text-rose-800 border-rose-200/70";

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className={`px-4 py-2.5 border-b ${tintClass}`}>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} accounts for this range.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="w-[140px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell className="font-mono text-xs text-foreground">
                  {row.code}
                </TableCell>
                <TableCell className="text-sm text-foreground">{row.name}</TableCell>
                <TableCell className="text-sm text-right tabular-nums">
                  {row.amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-sm font-semibold">
                {totalLabel}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums font-semibold">
                {totalAmount}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
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

  const pnl = query.data;
  const income = pnl?.income ?? [];
  const expense = pnl?.expense ?? [];
  const hasAnyRows = income.length > 0 || expense.length > 0;

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="Profit & Loss"
      subtitle="Income minus expense for the selected range."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pnl-from "
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none"
            >
              From
            </label>
            <Input
              id="pnl-from "
              type="date"
              value={from}
              onChange={handleFromChange}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="pnl-to"
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none"
            >
              To
            </label>
            <Input
              id="pnl-to"
              type="date"
              value={to}
              onChange={handleToChange}
              className="w-[160px]"
            />
          </div>
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load profit & loss"
            description={query.error.message}
          />
        ) : !pnl || !hasAnyRows ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              No income or expense activity for this range.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Pick a different date range or post entries to see this report populate.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportCard
                title="Income"
                tint="income"
                rows={income}
                totalLabel="Total Income"
                totalAmount={pnl.totalIncome}
              />
              <ReportCard
                title="Expense"
                tint="expense"
                rows={expense}
                totalLabel="Total Expense"
                totalAmount={pnl.totalExpense}
              />
            </div>
            <div className="rounded-xl border border-border/60 bg-card px-5 py-4 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-foreground">Net income</span>
              <span className="font-mono tabular-nums text-base font-semibold text-foreground">
                {pnl.netIncome}
              </span>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
