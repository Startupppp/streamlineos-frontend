"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useAgedReceivables } from "@/lib/api/hooks/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatAmount(value: string): string {
  return Number(value).toFixed(2);
}

export default function AgedReceivablesPage() {
  const [asOf, setAsOf] = useState<string>(todayIso());
  const query = useAgedReceivables(asOf);
  const report = query.data;

  function handleAsOfChange(event: ChangeEvent<HTMLInputElement>): void {
    setAsOf(event.target.value);
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="Aged Receivables"
      subtitle="Outstanding customer balances grouped by days overdue."
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <label htmlFor="aged-asof" className="text-sm text-slate-600 block mb-1">As of</label>
          <Input id="aged-asof" type="date" value={asOf} onChange={handleAsOfChange} />
        </div>
      </div>

      {query.isLoading && <LoadingState variant="table" />}
      {query.error && <ErrorState description={query.error.message} />}

      {report && report.rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600">
          No outstanding receivables as of {asOf}.
        </div>
      )}

      {report && report.rows.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
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
                <TableRow key={row.clientId}>
                  <TableCell>
                    <Link href={`/accounting/customers/${row.clientId}`} className="text-blue-600 hover:underline">
                      {row.clientName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.current)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.d1_30)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.d31_60)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(row.d61_90)}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600">{formatAmount(row.d91_plus)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatAmount(row.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-slate-50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatAmount(report.totals.current)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatAmount(report.totals.d1_30)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatAmount(report.totals.d31_60)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatAmount(report.totals.d61_90)}</TableCell>
                <TableCell className="text-right tabular-nums text-rose-600">{formatAmount(report.totals.d91_plus)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatAmount(report.totals.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
    </PageWrapper>
  );
}
