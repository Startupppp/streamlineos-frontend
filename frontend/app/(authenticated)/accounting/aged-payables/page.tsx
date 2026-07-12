"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useAgedPayables } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(value: string): string {
  return Number(value).toFixed(2);
}

export default function AgedPayablesPage() {
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
      eyebrow="Accounting · Reports"
      title="Aged Payables"
      subtitle="Outstanding vendor balances grouped by days overdue."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="aged-payables-asof" className="text-[11px] font-medium text-muted-foreground leading-none">As of</label>
            <DatePicker id="aged-payables-asof" value={asOf ?? ""} onChange={handleAsOfChange} placeholder="Pick a date" className="w-full sm:w-[160px] h-8 text-sm" />
          </div>
        </div>
      }
    >
      {query.isLoading ? (
        <LoadingState variant="table" />
      ) : query.error ? (
        <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
      ) : !report || report.rows.length === 0 ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="No outstanding payables"
          description={`No vendor balances are overdue as of ${asOf}.`}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Vendor</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Current</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">1–30 days</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">31–60 days</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">61–90 days</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">90+ days</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.vendorId} className="border-b border-border/50 hover:bg-muted/30">
                  <TableCell>
                    <Link
                      href={`/accounting/vendors/${row.vendorId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {row.vendorName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-sm">
                    {fmt(row.current)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-sm">
                    {fmt(row.d1_30)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-sm">
                    {fmt(row.d31_60)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-sm">
                    {fmt(row.d61_90)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600 font-mono text-sm">
                    {fmt(row.d91_plus)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium font-mono text-sm">
                    {fmt(row.total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums font-mono text-sm">
                  {fmt(report.totals.current)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-mono text-sm">
                  {fmt(report.totals.d1_30)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-mono text-sm">
                  {fmt(report.totals.d31_60)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-mono text-sm">
                  {fmt(report.totals.d61_90)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-rose-600 font-mono text-sm">
                  {fmt(report.totals.d91_plus)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-mono text-sm">
                  {fmt(report.totals.total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
