"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState } from "@/components/shared";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useVendorStatement } from "@/hooks/api/accounting/reports";
import { useVendorsOutstanding } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyFull } from "@/lib/format-utils";

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export function VendorStatementReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentMonthRange();

  const [vendorId, setVendorId] = useState<number | null>(
    params.get("vendorId") ? Number(params.get("vendorId")) : null,
  );
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const vendorsQuery = useVendorsOutstanding({ pageSize: 100 });
  const statementQuery = useVendorStatement(vendorId, from, to);

  function updateUrl(vid: number | null, f: string, t: string): void {
    const sp = new URLSearchParams();
    if (vid) sp.set("vendorId", String(vid));
    if (f) sp.set("from", f);
    if (t) sp.set("to", t);
    router.replace(`/accounting/reports/vendor-statement?${sp.toString()}`);
  }

  function handleVendorChange(value: string): void {
    const id = Number(value);
    setVendorId(id);
    updateUrl(id, from, to);
  }

  function handleFromChange(v: string): void {
    setFrom(v);
    updateUrl(vendorId, v, to);
  }

  function handleToChange(v: string): void {
    setTo(v);
    updateUrl(vendorId, from, v);
  }

  function handleRetry(): void {
    void statementQuery.refetch();
  }

  function handleExport(): void {
    if (!vendorId) return;
    void downloadCsv(
      `/accounting/reports/vendor-statement/${vendorId}/export`,
      { from, to },
      `vendor-statement-${vendorId}-${from}-${to}.csv`,
    );
  }

  const data = statementQuery.data;

  return (
    <ReportShell
      title="Vendor Statement"
      subtitle="Chronological AP activity for a vendor with running balance."
      onExport={vendorId ? handleExport : undefined}
      filters={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="vs-vendor" className="text-[11px] font-medium text-muted-foreground leading-none">
              Vendor
            </label>
            <Select value={vendorId ? String(vendorId) : ""} onValueChange={handleVendorChange}>
              <SelectTrigger id="vs-vendor" className="h-8 w-[200px] text-sm">
                <SelectValue placeholder="Select vendor…" />
              </SelectTrigger>
              <SelectContent>
                {(vendorsQuery.data?.items ?? []).map((v) => (
                  <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                    {v.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DateRangeFilter
            from={from}
            to={to}
            onFromChange={handleFromChange}
            onToChange={handleToChange}
            idPrefix="vs"
          />
        </div>
      }
    >
      {!vendorId ? (
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title="Select a vendor"
          description="Choose a vendor above to view their statement."
          compact
        />
      ) : statementQuery.isLoading ? (
        <LoadingState variant="table" rows={8} />
      ) : statementQuery.error ? (
        <ErrorState
          title="Failed to load statement"
          description={getErrorMessage(statementQuery.error)}
          onRetry={handleRetry}
        />
      ) : !data || data.lines.length === 0 ? (
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title="No transactions in this period"
          description="There are no AP transactions for this vendor in the selected date range."
          compact
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Document #</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Debit</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Credit</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-slate-50/60 border-b border-border/50">
                  <TableCell colSpan={5} className="text-xs font-medium text-muted-foreground px-3 py-2">Opening Balance</TableCell>
                  <TableCell className="text-right text-sm font-mono tabular-nums font-semibold px-3 py-2">
                    {formatCurrencyFull(Number(data.openingBalance))}
                  </TableCell>
                </TableRow>
                {data.lines.map((line, i) => (
                  <TableRow key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="text-xs text-foreground px-3 py-2">{line.date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground px-3 py-2">{line.docType}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground px-3 py-2">{line.docNumber}</TableCell>
                    <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">
                      {Number(line.debit) !== 0 ? formatCurrencyFull(Number(line.debit)) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">
                      {Number(line.credit) !== 0 ? formatCurrencyFull(Number(line.credit)) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono tabular-nums font-medium px-3 py-2">
                      {formatCurrencyFull(Number(line.runningBalance))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-sm font-semibold px-3 py-2">Closing Balance</TableCell>
                  <TableCell className="text-right text-sm font-mono tabular-nums font-bold px-3 py-2">
                    {formatCurrencyFull(Number(data.closingBalance))}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
