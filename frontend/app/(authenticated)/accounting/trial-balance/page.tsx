"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useTrialBalance } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
            <DatePicker id="tb-as-of" value={asOf ?? ""} onChange={handleAsOfChange} placeholder="Pick a date" className="w-full sm:w-[160px] h-8 text-sm" />
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
      {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load trial balance"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyTimeIllustration />}
            title="No posted entries for this date"
            description="Post journal entries with a date on or before the selected date to populate this report."
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Account</TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Type</TableHead>
                  <TableHead className="w-[140px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Debit</TableHead>
                  <TableHead className="w-[140px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Credit</TableHead>
                  <TableHead className="w-[140px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                    Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.accountId} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-foreground">
                      {row.code}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      {row.accountType}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-mono">
                      {row.debit}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-mono">
                      {row.credit}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-medium font-mono">
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
                  <TableCell className="text-sm text-right tabular-nums font-semibold font-mono">
                    {tb?.totalDebit ?? ""}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums font-semibold font-mono">
                    {tb?.totalCredit ?? ""}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
            </div>
          </div>
        )}
    </PageWrapper>
  );
}
