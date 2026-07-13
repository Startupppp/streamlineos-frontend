"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useSalesByCustomer } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { formatCurrencyFull } from "@/lib/format-utils";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

type SalesByCustomerRow = NonNullable<ReturnType<typeof useSalesByCustomer>["data"]>[number];

const SALES_BY_CUSTOMER_COLUMNS: DataTableColumn<SalesByCustomerRow>[] = [
  {
    key: "clientName",
    header: "Customer",
    cell: (row) => row.clientName,
  },
  {
    key: "invoiceCount",
    header: "Invoices",
    cell: (row) => row.invoiceCount,
    className: "text-right tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "totalBilled",
    header: "Total Billed",
    cell: (row) => formatCurrencyFull(Number(row.totalBilled)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "totalPaid",
    header: "Total Paid",
    cell: (row) => formatCurrencyFull(Number(row.totalPaid)),
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
  },
  {
    key: "outstanding",
    header: "Outstanding",
    cell: (row) => formatCurrencyFull(Number(row.outstanding)),
    className: "text-right font-mono tabular-nums font-medium",
    headerClassName: "text-right",
  },
];

function getSalesByCustomerRowKey(row: SalesByCustomerRow): string | number {
  return row.clientId;
}

export function SalesByCustomerReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentMonthRange();
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const { data, isLoading, error, refetch } = useSalesByCustomer(from, to);

  function updateUrl(f: string, t: string): void {
    router.replace(`/accounting/reports/sales-by-customer?from=${f}&to=${t}`);
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
      "/accounting/reports/sales-by-customer/export",
      { from, to },
      `sales-by-customer-${from}-${to}.csv`,
    );
  }

  return (
    <ReportShell
      title="Sales by Customer"
      subtitle="Invoice totals, payments, and outstanding amounts grouped by customer."
      onExport={handleExport}
      filters={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          idPrefix="sbc"
        />
      }
    >
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
          columns={SALES_BY_CUSTOMER_COLUMNS}
          getRowKey={getSalesByCustomerRowKey}
          isLoading={isLoading}
          minWidth="640px"
          emptyState={
            <EmptyState
              illustration={<EmptyReportIllustration />}
              title="No sales data"
              description="No invoices found in the selected date range."
              compact
            />
          }
        />
      )}
    </ReportShell>
  );
}
