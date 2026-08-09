"use client";

import { useState, memo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState } from "@/components/shared/error-state";
import { useBalanceSheet } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BalanceSheetRow } from "@/types/accounting";
import { Landmark, Scale, PiggyBank } from "lucide-react";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatBalance(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BalanceSheetSummaryStrip = memo(function BalanceSheetSummaryStrip({
  totalAssets,
  totalLiabilities,
  totalEquity,
}: {
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
}) {
  return (
    <StatCardGrid cols={3}>
      <StatCard label="Total Assets" value={formatBalance(totalAssets)} icon={Landmark} tone="blue" />
      <StatCard label="Total Liabilities" value={formatBalance(totalLiabilities)} icon={Scale} tone="red" />
      <StatCard label="Total Equity" value={formatBalance(totalEquity)} icon={PiggyBank} tone="emerald" />
    </StatCardGrid>
  );
});

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
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="balance-sheet-asof"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              As of
            </label>
            <DatePicker id="balance-sheet-asof" value={asOf ?? ""} onChange={handleAsOfChange} placeholder="Pick a date" className="w-[160px]" />
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
      {query.isLoading && (
        <div className="flex flex-1 min-h-0 flex-col space-y-3">
          <StatCardGridSkeleton cols={3} count={3} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/40">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex gap-4 px-1 py-2 border-b border-border">
                    {[24, 40, 28].map((w, j) => (
                      <Skeleton key={j} className="h-3" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  {Array.from({ length: 8 }).map((_, r) => (
                    <div key={r} className="flex gap-4 px-1 py-2">
                      {[24, 40, 28].map((w, j) => (
                        <Skeleton key={j} className="h-4" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {query.error && (
        <div className="flex flex-1 min-h-0 flex-col">
          <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
        </div>
      )}

      {report && (
        <div className="flex flex-1 min-h-0 flex-col space-y-3">
          <BalanceSheetSummaryStrip
            totalAssets={report.totalAssets}
            totalLiabilities={report.totalLiabilities}
            totalEquity={report.totalEquity}
          />
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
        </div>
      )}

      {report && (
        <div className="rounded-lg border border-border px-4 py-3 mt-3 flex justify-between items-center bg-muted/40">
          <div className="font-medium">Assets — (Liabilities + Equity)</div>
          <div className="text-lg font-mono tabular-nums">
            {(
              Number(report.totalAssets) -
              Number(report.totalLiabilities) -
              Number(report.totalEquity)
            ).toFixed(2)}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
