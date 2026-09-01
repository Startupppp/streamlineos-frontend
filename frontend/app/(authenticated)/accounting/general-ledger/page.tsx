"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useGeneralLedger, useGlAccounts } from "@/hooks/api/accounting/core";
import {
  useCustomersOutstanding,
  useVendorsOutstanding,
} from "@/hooks/api/accounting";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import type { GlRow } from "@/hooks/api/accounting/core";

const GL_LIMIT = 50;

function getMonthStart(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: string): string {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


const glColumns: DataTableColumn<GlRow>[] = [
  {
    key: "date",
    header: "Date",
    cell: (row) => (
      <span className="tabular-nums text-muted-foreground">
        {formatShortDate(row.date) || ""}
      </span>
    ),
    className: "w-[120px]",
    sortable: true,
    sortValue: (row) => row.date,
  },
  {
    key: "entryNumber",
    header: "Entry #",
    cell: (row) =>
      row.entryId !== null ? (
        <Link
          href={"/accounting/journal/" + String(row.entryId)}
          className="text-foreground hover:text-primary hover:underline font-mono text-xs"
        >
          {row.entryNumber}
        </Link>
      ) : (
        <span className="font-mono text-xs">{row.entryNumber}</span>
      ),
    className: "w-[140px]",
  },
  {
    key: "description",
    header: "Description",
    cell: (row) => (
      <span className="text-sm text-foreground">{row.description ?? ""}</span>
    ),
  },
  {
    key: "debit",
    header: "Debit",
    cell: (row) => (
      <span className="text-right font-mono text-sm tabular-nums text-destructive block">
        {parseFloat(row.debit) > 0
          ? parseFloat(row.debit).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ""}
      </span>
    ),
    className: "w-[130px] text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.debit),
  },
  {
    key: "credit",
    header: "Credit",
    cell: (row) => (
      <span className="text-right font-mono text-sm tabular-nums text-status-success-ink block">
        {parseFloat(row.credit) > 0
          ? parseFloat(row.credit).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ""}
      </span>
    ),
    className: "w-[130px] text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.credit),
  },
  {
    key: "runningBalance",
    header: "Balance",
    cell: (row) => (
      <span
        className={cn(
          "text-right font-mono text-sm tabular-nums block",
          parseFloat(row.runningBalance) < 0
            ? "text-destructive"
            : "text-foreground",
        )}
      >
        {formatMoney(row.runningBalance)}
      </span>
    ),
    className: "w-[140px] text-right",
    sortable: true,
    sortValue: (row) => parseFloat(row.runningBalance),
  },
];

export default function GeneralLedgerPage() {
  const [from, setFrom] = useState<string>(getMonthStart());
  const [to, setTo] = useState<string>(getToday());
  const [accountId, setAccountId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const canExport = useCan("accounting:reports:export");
  const { iconRef: exportIconRef, hoverHandlers: exportHoverHandlers } =
    useAnimatedIcon();

  const glAccountsQuery = useGlAccounts({ from, to });
  const glAccounts = glAccountsQuery.data?.items ?? [];

  const customersQuery = useCustomersOutstanding({ limit: 200 });
  const vendorsQuery = useVendorsOutstanding({ limit: 200 });

  const glQuery = useGeneralLedger({
    from,
    to,
    accountId: accountId ? parseInt(accountId, 10) : undefined,
    clientId: clientId ? parseInt(clientId, 10) : undefined,
    vendorId: vendorId ? parseInt(vendorId, 10) : undefined,
    cursor: cursors[cursorIndex] ?? undefined,
    limit: GL_LIMIT,
  });

  const glData = glQuery.data;
  const rows = glData?.items ?? [];
  const hasMore = glData?.nextCursor !== null && glData?.nextCursor !== undefined;

  function resetCursors(): void {
    setCursors([null]);
    setCursorIndex(0);
  }

  function handleFromChange(value: string): void {
    setFrom(value);
    resetCursors();
  }

  function handleToChange(value: string): void {
    setTo(value);
    resetCursors();
  }

  function handleAccountChange(value: string): void {
    setAccountId(value === "__none__" ? "" : value);
    resetCursors();
  }

  function handleClientChange(value: string): void {
    setClientId(value === "__none__" ? "" : value);
    resetCursors();
  }

  function handleVendorChange(value: string): void {
    setVendorId(value === "__none__" ? "" : value);
    resetCursors();
  }

  function handlePreviousPage(): void {
    setCursorIndex((prev) => Math.max(0, prev - 1));
  }

  function handleNextPage(): void {
    const next = glData?.nextCursor ?? null;
    setCursors((prev) => {
      const copy = prev.slice(0, cursorIndex + 1);
      copy.push(next);
      return copy;
    });
    setCursorIndex((prev) => prev + 1);
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
    void downloadCsv(
      "/accounting/general-ledger",
      params,
      `general-ledger-${from}-${to}.csv`,
    );
  }

  const hasDateRange = !!from && !!to;

  return (
    <PageWrapper
      title="General Ledger"
      subtitle="Account activity and running balances."
      actions={
        canExport && hasDateRange ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            {...exportHoverHandlers}
          >
            <DownloadIcon ref={exportIconRef} size={14} className="mr-1.5" />
            Export CSV
          </Button>
        ) : undefined
      }
      filters={
        <div className="space-y-2">
          <div className={FILTER_TOOLBAR_ROW}>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="gl-from"
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                From
              </label>
              <DatePicker
                id="gl-from"
                value={from}
                onChange={handleFromChange}
                placeholder="Start"
                className="w-[150px]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="gl-to"
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                To
              </label>
              <DatePicker
                id="gl-to"
                value={to}
                onChange={handleToChange}
                placeholder="End"
                className="w-[150px]"
              />
            </div>
            <Select
              value={accountId || "__none__"}
              onValueChange={handleAccountChange}
              disabled={!hasDateRange || glAccountsQuery.isLoading}
            >
              <SelectTrigger className={`w-[220px] ${FILTER_SELECT_TRIGGER}`}>
                <SelectValue
                  placeholder={
                    hasDateRange ? "Select account…" : "Set date range first"
                  }
                />
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMoreFilters}
            >
              {showMoreFilters ? "Fewer filters" : "More filters"}
            </Button>
          </div>
          {showMoreFilters && (
            <div className={FILTER_TOOLBAR_ROW}>
              <Select
                value={clientId || "__none__"}
                onValueChange={handleClientChange}
              >
                <SelectTrigger className={`w-[180px] ${FILTER_SELECT_TRIGGER}`}>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All clients</SelectItem>
                  {(customersQuery.data?.data ?? []).map((c) => (
                    <SelectItem key={c.clientId} value={String(c.clientId)}>
                      {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={vendorId || "__none__"}
                onValueChange={handleVendorChange}
              >
                <SelectTrigger className={`w-[180px] ${FILTER_SELECT_TRIGGER}`}>
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All vendors</SelectItem>
                  {(vendorsQuery.data?.data ?? []).map((v) => (
                    <SelectItem key={v.vendorId} value={String(v.vendorId)}>
                      {v.vendorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        {glData && (
          <StatCardGrid cols={2}>
            <StatCard
              label="Opening Balance"
              value={formatMoney(glData.openingBalance)}
              tone="default"
            />
            <StatCard
              label="Closing Balance"
              value={formatMoney(glData.closingBalance)}
              tone="emerald"
            />
          </StatCardGrid>
        )}

        {!hasDateRange ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary mb-3">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Select an account and date range
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Choose a date range above to view the general ledger.
            </p>
          </div>
        ) : glQuery.error ? (
          <ErrorState
            title="Failed to load ledger"
            description={getErrorMessage(glQuery.error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <DataTable
              className="flex-1 min-h-0"
              data={rows}
              columns={glColumns}
              getRowKey={(row) => row.entryId ?? row.entryNumber}
              isLoading={glQuery.isLoading}
              emptyState={
                <EmptyState
                  compact
                  title="No transactions found"
                  description="No activity for the selected account and date range."
                />
              }
              minWidth="700px"
            />
            {(cursorIndex > 0 || hasMore) ? (
              <CursorPageControls
                page={cursorIndex + 1}
                hasNext={hasMore}
                disabled={glQuery.isFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
                className="mt-2"
              />
            ) : null}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
