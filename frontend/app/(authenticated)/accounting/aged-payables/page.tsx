"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
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

  function handleAsOfChange(event: ChangeEvent<HTMLInputElement>): void {
    setAsOf(event.target.value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="Aged Payables"
      subtitle="Outstanding vendor balances grouped by days overdue."
    >
      <div className="rounded-lg border border-border bg-muted/40 p-3 mb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="aged-payables-asof" className="text-[11px] font-medium text-muted-foreground leading-none">As of</label>
            <Input id="aged-payables-asof" type="date" value={asOf} onChange={handleAsOfChange} className="w-full sm:w-[160px] h-8 text-sm" />
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState variant="table" />
      ) : query.error ? (
        <ErrorState description={query.error.message} onRetry={handleRetry} />
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
