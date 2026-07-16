"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
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
  "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#0ea5e9",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#1d4ed8",
];

type ExpenseByCategoryRow = NonNullable<ReturnType<typeof useExpenseByCategory>["data"]>[number];

const EXPENSE_BY_CATEGORY_COLUMNS: DataTableColumn<ExpenseByCategoryRow>[] = [
  {
    key: "categoryName",
    header: "Category",
    cell: (row) => row.categoryName,
  },
  {
    key: "count",
    header: "Count",
    cell: (row) => row.count,
    className: "text-right tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "totalAmount",
    header: "Total Amount",
    cell: (row) => formatCurrencyFull(Number(row.totalAmount)),
    className: "text-right font-mono tabular-nums font-medium",
    headerClassName: "text-right",
  },
];

function getExpenseCategoryRowKey(row: ExpenseByCategoryRow): string | number {
  return row.categoryId;
}

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
      <div className="flex flex-1 min-h-0 flex-col">
        {error ? (
          <ErrorState
            title="Failed to load report"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : !isLoading && (data?.length ?? 0) === 0 ? (
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title="No expense data"
            description="No expenses found in the selected date range."
            compact
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
            <DataTable
              className="flex-1 min-h-0"
              data={data ?? []}
              columns={EXPENSE_BY_CATEGORY_COLUMNS}
              getRowKey={getExpenseCategoryRowKey}
              isLoading={isLoading}
              minWidth="400px"
            />
            {!isLoading && (data?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center">
                <p className="text-sm font-semibold text-foreground mb-4 self-start">Distribution</p>
                <MiniDonutChart
                  data={donutData}
                  size={160}
                  strokeWidth={24}
                  centerLabel="categories"
                  centerValue={data?.length ?? 0}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ReportShell>
  );
}
