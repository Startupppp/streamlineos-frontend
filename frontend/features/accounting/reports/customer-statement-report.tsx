"use client";

import { useState, useCallback } from "react";
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
import { useCustomerStatement } from "@/hooks/api/accounting/reports";
import { useCustomersOutstanding } from "@/hooks/api/accounting";
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

export function CustomerStatementReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentMonthRange();

  const [clientId, setClientId] = useState<number | null>(
    params.get("clientId") ? Number(params.get("clientId")) : null,
  );
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const customersQuery = useCustomersOutstanding({ pageSize: 100 });
  const statementQuery = useCustomerStatement(clientId, from, to);

  function updateUrl(cid: number | null, f: string, t: string): void {
    const sp = new URLSearchParams();
    if (cid) sp.set("clientId", String(cid));
    if (f) sp.set("from", f);
    if (t) sp.set("to", t);
    router.replace(`/accounting/reports/customer-statement?${sp.toString()}`);
  }

  function handleClientChange(value: string): void {
    const id = Number(value);
    setClientId(id);
    updateUrl(id, from, to);
  }

  function handleFromChange(v: string): void {
    setFrom(v);
    updateUrl(clientId, v, to);
  }

  function handleToChange(v: string): void {
    setTo(v);
    updateUrl(clientId, from, v);
  }

  function handleRetry(): void {
    void statementQuery.refetch();
  }

  function handleExport(): void {
    if (!clientId) return;
    void downloadCsv(
      `/accounting/reports/customer-statement/${clientId}/export`,
      { from, to },
      `customer-statement-${clientId}-${from}-${to}.csv`,
    );
  }

  const data = statementQuery.data;

  return (
    <ReportShell
      title="Customer Statement"
      subtitle="Chronological AR activity for a customer with running balance."
      onExport={clientId ? handleExport : undefined}
      filters={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="cs-client" className="text-[11px] font-medium text-muted-foreground leading-none">
              Customer
            </label>
            <Select value={clientId ? String(clientId) : ""} onValueChange={handleClientChange}>
              <SelectTrigger id="cs-client" className="h-8 w-[200px] text-sm">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {(customersQuery.data?.items ?? []).map((c) => (
                  <SelectItem key={c.clientId} value={String(c.clientId)}>
                    {c.clientName}
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
            idPrefix="cs"
          />
        </div>
      }
    >
      {!clientId ? (
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title="Select a customer"
          description="Choose a customer above to view their statement."
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
          description="There are no AR transactions for this customer in the selected date range."
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
