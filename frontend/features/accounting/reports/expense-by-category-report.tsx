"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { MiniDonutChart } from "@/components/charts/mini-donut-chart";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useExpenseByCategory } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { formatCurrencyFull } from "@/lib/format-utils";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

const CHART_COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1",
];

export function ExpenseByCategoryReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentMonthRange();
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const { data, isLoading, error, refetch } = useExpenseByCategory(from, to);

  function updateUrl(f: string, t: string): void {
    router.replace(`/accounting/reports/expense-by-category?from=${f}&to=${t}`);
  }

  function handleFromChange(v: string): void {
    setFrom(v);
    updateUrl(v, to);
  }

  function handleToChange(v: string): void {
    setTo(v);
    updateUrl(from, v);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleExport(): void {
    void downloadCsv(
      "/accounting/reports/expense-by-category/export",
      { from, to },
      `expense-by-category-${from}-${to}.csv`,
    );
  }

  const donutData =
    data?.slice(0, 10).map((row, i) => ({
      label: row.categoryName,
      value: Number(row.totalAmount) || 0,
      color: CHART_COLORS[i % CHART_COLORS.length] ?? "#3b82f6",
    })) ?? [];

  return (
    <ReportShell
      title="Expense by Category"
      subtitle="Approved and paid expenses grouped by expense category."
      onExport={handleExport}
      filters={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          idPrefix="ebc"
        />
      }
    >
      {isLoading ? (
        <LoadingState variant="table" rows={8} />
      ) : error ? (
        <ErrorState
          title="Failed to load report"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title="No expense data"
          description="No expenses found in the selected date range."
          compact
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Category</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Count</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.categoryId} className="border-b border-border/50 hover:bg-muted/30">
                      <TableCell className="text-sm text-foreground px-3 py-2">{row.categoryName}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums px-3 py-2">{row.count}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums font-medium px-3 py-2">
                        {formatCurrencyFull(Number(row.totalAmount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center">
            <p className="text-sm font-semibold text-foreground mb-4 self-start">Distribution</p>
            <MiniDonutChart
              data={donutData}
              size={160}
              strokeWidth={24}
              centerLabel="categories"
              centerValue={data.length}
            />
          </div>
        </div>
      )}
    </ReportShell>
  );
}
