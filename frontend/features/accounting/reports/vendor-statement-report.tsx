"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ReportShell } from "./report-shell";
import { DateRangeFilter } from "./date-range-filter";
import { useVendorStatement } from "@/hooks/api/accounting/reports";
import { useVendorsOutstanding } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/accounting/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { formatCurrencyFull } from "@/lib/format-utils";

type VendorStatementRow =
  | { kind: "opening"; balance: string | number; _idx: number }
  | { kind: "line"; date: string; docType: string; docNumber: string; debit: string | number; credit: string | number; runningBalance: string | number; _idx: number };

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

const columns: DataTableColumn<VendorStatementRow>[] = [
  {
    key: "date",
    header: "Date",
    cell: function renderDate(row) {
      if (row.kind === "opening") {
        return <span className="text-xs font-medium text-muted-foreground">Opening Balance</span>;
      }
      return <span className="text-xs text-foreground">{row.date}</span>;
    },
  },
  {
    key: "docType",
    header: "Type",
    cell: function renderDocType(row) {
      if (row.kind === "opening") return null;
      return <span className="text-xs text-muted-foreground">{row.docType}</span>;
    },
  },
  {
    key: "docNumber",
    header: "Document #",
    cell: function renderDocNumber(row) {
      if (row.kind === "opening") return null;
      return <span className="text-xs font-mono text-foreground">{row.docNumber}</span>;
    },
  },
  {
    key: "debit",
    header: "Debit",
    headerClassName: "text-right",
    className: "text-right",
    cell: function renderDebit(row) {
      if (row.kind === "opening") return null;
      return (
        <span className="text-sm font-mono tabular-nums">
          {Number(row.debit) !== 0 ? formatCurrencyFull(Number(row.debit)) : "—"}
        </span>
      );
    },
  },
  {
    key: "credit",
    header: "Credit",
    headerClassName: "text-right",
    className: "text-right",
    cell: function renderCredit(row) {
      if (row.kind === "opening") return null;
      return (
        <span className="text-sm font-mono tabular-nums">
          {Number(row.credit) !== 0 ? formatCurrencyFull(Number(row.credit)) : "—"}
        </span>
      );
    },
  },
  {
    key: "balance",
    header: "Balance",
    headerClassName: "text-right",
    className: "text-right",
    cell: function renderBalance(row) {
      if (row.kind === "opening") {
        return (
          <span className="text-sm font-mono tabular-nums font-semibold">
            {formatCurrencyFull(Number(row.balance))}
          </span>
        );
      }
      return (
        <span className="text-sm font-mono tabular-nums font-medium">
          {formatCurrencyFull(Number(row.runningBalance))}
        </span>
      );
    },
  },
];

export function VendorStatementReport() {
  const router = useRouter();
  const params = useSearchParams();
  const defaults = currentMonthRange();

  const [vendorId, setVendorId] = useState<number | null>(
    params.get("vendorId") ? Number(params.get("vendorId")) : null,
  );
  const [from, setFrom] = useState(params.get("from") ?? defaults.from);
  const [to, setTo] = useState(params.get("to") ?? defaults.to);

  const vendorsQuery = useVendorsOutstanding({ limit: 100 });
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

  const rows: VendorStatementRow[] = data
    ? [
        { kind: "opening", balance: data.openingBalance, _idx: 0 },
        ...data.lines.map(
          (l, i) =>
            ({
              kind: "line" as const,
              date: l.date,
              docType: l.docType,
              docNumber: l.docNumber,
              debit: l.debit,
              credit: l.credit,
              runningBalance: l.runningBalance,
              _idx: i + 1,
            }) satisfies VendorStatementRow,
        ),
      ]
    : [];

  function getRowKey(row: VendorStatementRow): number {
    return row._idx;
  }

  function rowClassName(row: VendorStatementRow): string {
    return row.kind === "opening" ? "bg-muted/60 border-b border-border/50" : "";
  }

  const closingBalanceFooter: ReactNode = data ? (
    <div className="flex justify-between font-semibold text-sm px-1">
      <span>Closing Balance</span>
      <span className="font-mono tabular-nums font-bold">
        {formatCurrencyFull(Number(data.closingBalance))}
      </span>
    </div>
  ) : null;

  return (
    <ReportShell
      title="Vendor Statement"
      subtitle="Chronological AP activity for a vendor with running balance."
      onExport={vendorId ? handleExport : undefined}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={vendorId ? String(vendorId) : ""} onValueChange={handleVendorChange}>
            <SelectTrigger id="vs-vendor" className={`w-[200px] ${FILTER_SELECT_TRIGGER}`}>
              <SelectValue placeholder="Select vendor…" />
            </SelectTrigger>
            <SelectContent>
              {(vendorsQuery.data?.data ?? []).map((v) => (
                <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                  {v.vendorName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="flex flex-1 min-h-0 flex-col">
        {!vendorId ? (
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title="Select a vendor"
            description="Choose a vendor above to view their statement."
            compact
          />
        ) : statementQuery.error ? (
          <ErrorState
            title="Failed to load statement"
            description={getErrorMessage(statementQuery.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={rows}
            columns={columns}
            getRowKey={getRowKey}
            rowClassName={rowClassName}
            isLoading={statementQuery.isLoading}
            minWidth="680px"
            footer={closingBalanceFooter}
            emptyState={
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No transactions in this period"
                description="There are no AP transactions for this vendor in the selected date range."
                compact
              />
            }
          />
        )}
      </div>
    </ReportShell>
  );
}
