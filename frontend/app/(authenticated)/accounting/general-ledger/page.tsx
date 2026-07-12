"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTablePagination, LoadingState, ErrorState } from "@/components/shared";
import { useGeneralLedger, useGlAccounts } from "@/hooks/api/accounting/core";
import { useCustomersOutstanding, useVendorsOutstanding } from "@/hooks/api/accounting";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import type { GlRow } from "@/hooks/api/accounting/core";

function getMonthStart(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatMoney(value: string): string {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumDebit(rows: GlRow[]): number {
  return rows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0);
}

function sumCredit(rows: GlRow[]): number {
  return rows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);
}

function isNegative(value: string): boolean {
  return parseFloat(value) < 0;
}

const PAGE_SIZE = 50;

export default function GeneralLedgerPage() {
  const [from, setFrom] = useState<string>(getMonthStart());
  const [to, setTo] = useState<string>(getToday());
  const [accountId, setAccountId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);

  const canExport = useCan("accounting:reports:export");

  const glAccountsQuery = useGlAccounts({ from, to });
  const glAccounts = glAccountsQuery.data?.items ?? [];

  const customersQuery = useCustomersOutstanding({ pageSize: 200 });
  const vendorsQuery = useVendorsOutstanding({ pageSize: 200 });

  const glQuery = useGeneralLedger({
    from,
    to,
    accountId: accountId ? parseInt(accountId, 10) : undefined,
    clientId: clientId ? parseInt(clientId, 10) : undefined,
    vendorId: vendorId ? parseInt(vendorId, 10) : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const glData = glQuery.data;
  const rows = glData?.rows ?? [];
  const totalPages = glData?.totalPages ?? 1;

  const periodDebit = sumDebit(rows);
  const periodCredit = sumCredit(rows);

  function handleFromChange(value: string): void {
    setFrom(value);
    setPage(1);
  }

  function handleToChange(value: string): void {
    setTo(value);
    setPage(1);
  }

  function handleAccountChange(value: string): void {
    setAccountId(value === "__none__" ? "" : value);
    setPage(1);
  }

  function handleClientChange(value: string): void {
    setClientId(value === "__none__" ? "" : value);
    setPage(1);
  }

  function handleVendorChange(value: string): void {
    setVendorId(value === "__none__" ? "" : value);
    setPage(1);
  }

  function handlePageChange(newPage: number): void {
    setPage(newPage);
  }

  function handleToggleMoreFilters(): void {
    setShowMoreFilters((prev) => !prev);
  }

  function handleRetry(): void {
    void glQuery.refetch();
  }

  function handleExport(): void {
    const params: Record<string, string> = { from, to, format: "csv" };
    if (accountId) params.accountId = accountId;
    if (clientId) params.clientId = clientId;
    if (vendorId) params.vendorId = vendorId;
    void downloadCsv("/accounting/general-ledger", params, `general-ledger-${from}-${to}.csv`);
  }

  const hasDateRange = !!from && !!to;

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="General Ledger"
      subtitle="Account activity and running balances."
      actions={
        canExport && hasDateRange ? (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        ) : undefined
      }
      filters={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label htmlFor="gl-from" className="text-xs text-muted-foreground whitespace-nowrap">From</label>
              <DatePicker id="gl-from" value={from} onChange={handleFromChange} placeholder="Start" className="h-8 text-xs w-[150px]" />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="gl-to" className="text-xs text-muted-foreground whitespace-nowrap">To</label>
              <DatePicker id="gl-to" value={to} onChange={handleToChange} placeholder="End" className="h-8 text-xs w-[150px]" />
            </div>
            <Select value={accountId || "__none__"} onValueChange={handleAccountChange} disabled={!hasDateRange || glAccountsQuery.isLoading}>
              <SelectTrigger className="h-8 text-xs w-[220px]">
                <SelectValue placeholder={hasDateRange ? "Select account…" : "Set date range first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All accounts</SelectItem>
                {glAccounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleToggleMoreFilters}>
              {showMoreFilters ? "Fewer filters" : "More filters"}
            </Button>
          </div>
          {showMoreFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={clientId || "__none__"} onValueChange={handleClientChange}>
                <SelectTrigger className="h-8 text-xs w-[180px]">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All clients</SelectItem>
                  {(customersQuery.data?.items ?? []).map((c) => (
                    <SelectItem key={c.clientId} value={String(c.clientId)}>{c.clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={vendorId || "__none__"} onValueChange={handleVendorChange}>
                <SelectTrigger className="h-8 text-xs w-[180px]">
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All vendors</SelectItem>
                  {(vendorsQuery.data?.items ?? []).map((v) => (
                    <SelectItem key={v.vendorId} value={String(v.vendorId)}>{v.vendorName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {glData && (
          <StatCardGrid cols={4}>
            <StatCard label="Opening Balance" value={formatMoney(glData.openingBalance)} tone="default" />
            <StatCard label="Period Debits" value={periodDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tone="red" />
            <StatCard label="Period Credits" value={periodCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tone="emerald" />
            <StatCard label="Closing Balance" value={formatMoney(glData.closingBalance)} tone={isNegative(glData.closingBalance) ? "red" : "default"} />
          </StatCardGrid>
        )}

        {!hasDateRange ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600 mb-3">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Select an account and date range</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Choose a date range above to view the general ledger.
            </p>
          </div>
        ) : glQuery.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : glQuery.error ? (
          <ErrorState title="Failed to load ledger" description={getErrorMessage(glQuery.error)} onRetry={handleRetry} />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">No transactions found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              No activity for the selected account and date range.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px]">Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[140px]">Entry #</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Description</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[130px] text-right">Debit</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[130px] text-right">Credit</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[140px] text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row: GlRow, idx: number) => (
                      <TableRow key={`${row.entryNumber}-${idx}`} className="border-b border-border/50 hover:bg-muted/30">
                        <TableCell className="text-sm tabular-nums text-muted-foreground px-3 py-2">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell className="font-mono text-xs px-3 py-2">
                          {row.entryId ? (
                            <Link href={`/accounting/journal/${row.entryId}`} className="text-foreground hover:text-blue-600 hover:underline">
                              {row.entryNumber}
                            </Link>
                          ) : (
                            row.entryNumber
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-foreground px-3 py-2">
                          {row.description ?? ""}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums px-3 py-2 text-destructive">
                          {parseFloat(row.debit) > 0 ? parseFloat(row.debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums px-3 py-2 text-emerald-600">
                          {parseFloat(row.credit) > 0 ? parseFloat(row.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono text-sm tabular-nums px-3 py-2", isNegative(row.runningBalance) ? "text-destructive" : "text-foreground")}>
                          {formatMoney(row.runningBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {totalPages > 1 && (
              <DataTablePagination
                page={page}
                limit={PAGE_SIZE}
                total={glData?.total ?? 0}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
