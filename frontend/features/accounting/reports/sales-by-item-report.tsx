"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useSalesByItem } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatCurrencyFull } from "@/lib/format-utils";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

type SalesByItemRow = NonNullable<ReturnType<typeof useSalesByItem>["data"]>[number];

const SALES_BY_ITEM_COLUMNS: DataTableColumn<SalesByItemRow>[] = [
  {
    key: "description",
    header: "Description",
    cell: (row) => <TruncatedText text={row.description} lines={2} className="text-sm" />,
  },
  {
    key: "totalQuantity",
    header: "Quantity",
    cell: (row) => row.totalQuantity,
    className: "text-right tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "totalAmount",
    header: "Amount",
    cell: (row) => formatCurrencyFull(Number(row.totalAmount)),
    className: "text-right font-mono tabular-nums font-medium",
    headerClassName: "text-right",
  },
  {
    key: "invoiceCount",
    header: "Invoices",
    cell: (row) => row.invoiceCount,
    className: "text-right tabular-nums",
    headerClassName: "text-right",
  },
];

function getSalesByItemRowKey(row: SalesByItemRow): string {
  return row.description;
}

export function SalesByItemReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentMonthRange();
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const { data, isLoading, error, refetch } = useSalesByItem(from, to);

  function updateUrl(f: string, t: string): void {
    router.replace(`/accounting/reports/sales-by-item?from=${f}&to=${t}`);
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
      "/accounting/reports/sales-by-item/export",
      { from, to },
      `sales-by-item-${from}-${to}.csv`,
    );
  }

  return (
    <ReportShell
      title="Sales by Item"
      subtitle="Revenue breakdown by line-item description."
      onExport={handleExport}
      filters={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          idPrefix="sbi"
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
          <DataTable
            className="flex-1 min-h-0"
            data={data ?? []}
            columns={SALES_BY_ITEM_COLUMNS}
            getRowKey={getSalesByItemRowKey}
            isLoading={isLoading}
            minWidth="540px"
            emptyState={
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No sales data"
                description="No invoice line items found in the selected date range."
                compact
              />
            }
          />
        )}
      </div>
    </ReportShell>
  );
}
