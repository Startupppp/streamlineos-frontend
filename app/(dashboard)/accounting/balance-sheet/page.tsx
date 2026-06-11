"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useBalanceSheet } from "@/lib/api/hooks/accounting";
import type { BalanceSheetRow } from "@/types/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type SectionProps = {
  title: string;
  rows: BalanceSheetRow[];
  total: string;
  accentClass: string;
  extraRow?: { label: string; value: string };
};

function Section({ title, rows, total, accentClass, extraRow }: SectionProps) {
  return (
    <Card className="overflow-hidden">
      <div className={`px-4 py-3 font-medium border-b ${accentClass}`}>{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-sm text-slate-600 py-6 text-center">
                No accounts with a balance.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.accountId}>
                <TableCell className="font-mono">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(row.balance).toFixed(2)}</TableCell>
              </TableRow>
            ))
          )}
          {extraRow && (
            <TableRow>
              <TableCell className="font-mono">—</TableCell>
              <TableCell>{extraRow.label}</TableCell>
              <TableCell className="text-right tabular-nums">{Number(extraRow.value).toFixed(2)}</TableCell>
            </TableRow>
          )}
          <TableRow className="font-medium bg-slate-50">
            <TableCell colSpan={2}>Total {title}</TableCell>
            <TableCell className="text-right tabular-nums">{Number(total).toFixed(2)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState<string>(todayIso());
  const query = useBalanceSheet(asOf);
  const report = query.data;

  function handleAsOfChange(event: ChangeEvent<HTMLInputElement>): void {
    setAsOf(event.target.value);
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="Balance Sheet"
      subtitle="Snapshot of assets, liabilities, and equity as of a chosen date."
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <label htmlFor="balance-sheet-asof" className="text-sm text-slate-600 block mb-1">As of</label>
          <Input id="balance-sheet-asof" type="date" value={asOf} onChange={handleAsOfChange} />
        </div>
        {report && (
          <div className="ml-auto text-sm">
            {report.balanced ? (
              <span className="text-emerald-600">Balanced ✓</span>
            ) : (
              <span className="text-rose-600">Imbalanced — Assets ≠ Liabilities + Equity</span>
            )}
          </div>
        )}
      </div>

      {query.isLoading && <LoadingState variant="table" />}
      {query.error && <ErrorState description={query.error.message} />}

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section
            title="Assets"
            rows={report.assets}
            total={report.totalAssets}
            accentClass="bg-blue-50 border-blue-200/60"
          />
          <Section
            title="Liabilities"
            rows={report.liabilities}
            total={report.totalLiabilities}
            accentClass="bg-rose-50 border-rose-200/60"
          />
          <Section
            title="Equity"
            rows={report.equity}
            total={report.totalEquity}
            accentClass="bg-emerald-50 border-emerald-200/60"
            extraRow={{ label: "Retained Earnings (period-to-date)", value: report.retainedEarnings }}
          />
        </div>
      )}

      {report && (
        <Card className="p-4 mt-4 flex justify-between items-center bg-slate-50">
          <div className="font-medium">Assets — (Liabilities + Equity)</div>
          <div className="text-lg font-mono tabular-nums">
            {(Number(report.totalAssets) - Number(report.totalLiabilities) - Number(report.totalEquity)).toFixed(2)}
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
