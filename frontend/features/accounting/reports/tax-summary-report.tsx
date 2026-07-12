"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useTaxSummary } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { formatCurrencyFull } from "@/lib/format-utils";

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

function currentYearRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
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
          title="No tax data"
          description="No GST transactions found in the selected date range."
          compact
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-4">Output vs Input Tax by Month</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} width={56} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="output" name="Output Tax" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="input" name="Input Tax (ITC)" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="netPayable" name="Net Payable" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Month</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Out CGST</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Out SGST</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Out IGST</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">In CGST</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">In SGST</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">In IGST</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.month} className="border-b border-border/50 hover:bg-muted/30">
                      <TableCell className="text-sm text-foreground px-3 py-2">{row.month}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">{formatCurrencyFull(Number(row.outputCgst))}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">{formatCurrencyFull(Number(row.outputSgst))}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">{formatCurrencyFull(Number(row.outputIgst))}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">{formatCurrencyFull(Number(row.inputCgst))}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">{formatCurrencyFull(Number(row.inputSgst))}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">{formatCurrencyFull(Number(row.inputIgst))}</TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums font-semibold px-3 py-2">
                        {formatCurrencyFull(Number(row.netPayable))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
