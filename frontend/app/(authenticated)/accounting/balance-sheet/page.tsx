"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
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
import { useBalanceSheet } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
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
    <div className="rounded-lg border border-border overflow-hidden">
      <div className={`px-4 py-3 font-medium border-b ${accentClass}`}>
        {title}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
            <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Code</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Account</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-sm text-muted-foreground py-6 text-center"
              >
                No accounts with a balance.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.accountId} className="border-b border-border/50 hover:bg-muted/30">
                <TableCell className="font-mono">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {Number(row.balance).toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          )}
          {extraRow && (
            <TableRow>
              <TableCell className="font-mono">—</TableCell>
              <TableCell>{extraRow.label}</TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {Number(extraRow.value).toFixed(2)}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="font-medium bg-muted/40">
            <TableCell colSpan={2}>Total {title}</TableCell>
            <TableCell className="text-right font-mono text-sm tabular-nums">
              {Number(total).toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState<string>(todayIso());
  const query = useBalanceSheet(asOf);
  const report = query.data;

  function handleAsOfChange(value: string): void {
    setAsOf(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      title="Balance Sheet"
      subtitle="Snapshot of assets, liabilities, and equity as of a chosen date."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="balance-sheet-asof"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              As of
            </label>
            <DatePicker id="balance-sheet-asof" value={asOf ?? ""} onChange={handleAsOfChange} placeholder="Pick a date" className="w-full sm:w-[160px] h-8 text-sm" />
          </div>
          {report && (
            <div className="ml-auto text-sm">
              {report.balanced ? (
                <span className="text-emerald-600 dark:text-emerald-400">Balanced ✓</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">
                  Imbalanced — Assets ≠ Liabilities + Equity
                </span>
              )}
            </div>
          )}
        </div>
      }
    >
      {query.isLoading && <LoadingState variant="table" />}
      {query.error && (
        <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
      )}

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section
            title="Assets"
            rows={report.assets}
            total={report.totalAssets}
            accentClass="bg-primary/5 border-primary/20"
          />
          <Section
            title="Liabilities"
            rows={report.liabilities}
            total={report.totalLiabilities}
            accentClass="bg-rose-50 border-rose-200/60 dark:bg-rose-500/10 dark:border-rose-500/30"
          />
          <Section
            title="Equity"
            rows={report.equity}
            total={report.totalEquity}
            accentClass="bg-emerald-50 border-emerald-200/60 dark:bg-emerald-500/10 dark:border-emerald-500/30"
            extraRow={{
              label: "Retained Earnings (period-to-date)",
              value: report.retainedEarnings,
            }}
          />
        </div>
      )}

      {report && (
        <Card className="p-4 mt-4 flex justify-between items-center bg-muted/40">
          <div className="font-medium">Assets — (Liabilities + Equity)</div>
          <div className="text-lg font-mono tabular-nums">
            {(
              Number(report.totalAssets) -
              Number(report.totalLiabilities) -
              Number(report.totalEquity)
            ).toFixed(2)}
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
