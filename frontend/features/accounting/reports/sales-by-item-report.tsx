"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useSalesByItem } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { formatCurrencyFull } from "@/lib/format-utils";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
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
          title="No sales data"
          description="No invoice line items found in the selected date range."
          compact
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[540px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Description</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Quantity</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Amount</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="text-sm text-foreground px-3 py-2">{row.description}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums px-3 py-2">{row.totalQuantity}</TableCell>
                    <TableCell className="text-right text-sm font-mono tabular-nums font-medium px-3 py-2">
                      {formatCurrencyFull(Number(row.totalAmount))}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums px-3 py-2">{row.invoiceCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
