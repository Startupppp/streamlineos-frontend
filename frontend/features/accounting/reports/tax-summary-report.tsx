"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useTaxSummary } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { formatCurrencyFull } from "@/lib/format-utils";

const TaxSummaryChart = dynamic(
  () =>
    import("./tax-summary-chart").then((m) => ({
      default: m.TaxSummaryChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-[268px] w-full rounded-xl" /> },
);

function currentYearRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

type TaxSummaryRow = NonNullable<ReturnType<typeof useTaxSummary>["data"]>[number];

const TAX_COLUMNS: DataTableColumn<TaxSummaryRow>[] = [
  {
    key: "month",
    header: "Month",
    cell: (row) => row.month,
  },
  {
    key: "outputCgst",
    header: "Out CGST",
    cell: (row) => formatCurrencyFull(Number(row.outputCgst)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "outputSgst",
    header: "Out SGST",
    cell: (row) => formatCurrencyFull(Number(row.outputSgst)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "outputIgst",
    header: "Out IGST",
    cell: (row) => formatCurrencyFull(Number(row.outputIgst)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "inputCgst",
    header: "In CGST",
    cell: (row) => formatCurrencyFull(Number(row.inputCgst)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "inputSgst",
    header: "In SGST",
    cell: (row) => formatCurrencyFull(Number(row.inputSgst)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "inputIgst",
    header: "In IGST",
    cell: (row) => formatCurrencyFull(Number(row.inputIgst)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "netPayable",
    header: "Net Payable",
    cell: (row) => formatCurrencyFull(Number(row.netPayable)),
    className: "text-right font-mono tabular-nums font-semibold",
    headerClassName: "text-right",
  },
];

function getTaxRowKey(row: TaxSummaryRow): string {
  return row.month;
}

export function TaxSummaryReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentYearRange();
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const { data, isLoading, error, refetch } = useTaxSummary(from, to);

  function updateUrl(f: string, t: string): void {
    router.replace(`/accounting/reports/tax-summary?from=${f}&to=${t}`);
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
      "/accounting/reports/tax-summary/export",
      { from, to },
      `tax-summary-${from}-${to}.csv`,
    );
  }

  const chartData =
    data?.map((row) => ({
      month: row.month.slice(5),
      output: Number(row.outputCgst) + Number(row.outputSgst) + Number(row.outputIgst),
      input: Number(row.inputCgst) + Number(row.inputSgst) + Number(row.inputIgst),
      netPayable: Number(row.netPayable),
    })) ?? [];

  return (
    <ReportShell
      title="GST Tax Summary"
      subtitle="Monthly CGST/SGST/IGST output vs input tax summary and net payable."
      onExport={handleExport}
      filters={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          idPrefix="ts"
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
        ) : (
          <div className="space-y-6">
            {!isLoading && (data?.length ?? 0) > 0 && (
              <TaxSummaryChart chartData={chartData} />
            )}

            <DataTable
              className="flex-1 min-h-0"
              data={data ?? []}
              columns={TAX_COLUMNS}
              getRowKey={getTaxRowKey}
              isLoading={isLoading}
              minWidth="800px"
              emptyState={
                <EmptyState
                  illustration={<EmptyReportIllustration />}
                  title="No tax data"
                  description="No GST transactions found in the selected date range."
                  compact
                />
              }
            />
          </div>
        )}
      </div>
    </ReportShell>
  );
}
