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
import { useTrialBalance } from "@/lib/api/hooks/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState<string>(todayIso());

  const query = useTrialBalance(asOf);

  function handleAsOfChange(event: ChangeEvent<HTMLInputElement>): void {
    setAsOf(event.target.value);
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
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="tb-as-of"
              className="text-[11px] font-medium text-slate-500 leading-none"
            >
              As of
            </label>
            <Input
              id="tb-as-of"
              type="date"
              value={asOf}
              onChange={handleAsOfChange}
              className="w-[160px]"
            />
          </div>
          {tb ? (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500 leading-none">
                Status
              </span>
              {tb.balanced ? (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/70">
                  Balanced ✓
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200/70">
                  Imbalanced
                </span>
              )}
            </div>
          ) : null}
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load trial balance"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              No posted entries yet for this date.
            </h3>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[140px] text-right">Debit</TableHead>
                  <TableHead className="w-[140px] text-right">Credit</TableHead>
                  <TableHead className="w-[140px] text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.accountId}>
                    <TableCell className="font-mono text-xs text-foreground">
                      {row.code}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      {row.accountType}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {row.debit}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {row.credit}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-medium">
                      {row.balance}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-sm font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums font-semibold">
                    {tb?.totalDebit ?? ""}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums font-semibold">
                    {tb?.totalCredit ?? ""}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
