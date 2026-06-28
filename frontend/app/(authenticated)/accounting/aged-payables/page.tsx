"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useAgedPayables } from "@/lib/api/hooks/accounting";

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
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <label htmlFor="aged-payables-asof" className="text-sm text-muted-foreground block mb-1">As of</label>
          <Input id="aged-payables-asof" type="date" value={asOf} onChange={handleAsOfChange} />
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
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1–30 days</TableHead>
                <TableHead className="text-right">31–60 days</TableHead>
                <TableHead className="text-right">61–90 days</TableHead>
                <TableHead className="text-right">90+ days</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.vendorId}>
                  <TableCell>
                    <Link href={`/accounting/vendors/${row.vendorId}`} className="text-blue-600 hover:underline">
                      {row.vendorName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(row.current)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(row.d1_30)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(row.d31_60)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(row.d61_90)}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600">{fmt(row.d91_plus)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{fmt(row.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(report.totals.current)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(report.totals.d1_30)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(report.totals.d31_60)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(report.totals.d61_90)}</TableCell>
                <TableCell className="text-right tabular-nums text-rose-600">{fmt(report.totals.d91_plus)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(report.totals.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
    </PageWrapper>
  );
}
