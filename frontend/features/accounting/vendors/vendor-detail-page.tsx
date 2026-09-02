"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Receipt, Wallet, AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useVendorLedger } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { type VendorLedgerLine } from "@/types/accounting";
import { formatCurrency } from "@/features/accounting/lib/format-currency";

function formatSource(sourceType: string, sourceEvent: string | null): string {
  if (sourceEvent) return `${sourceType} · ${sourceEvent}`;
  return sourceType;
}

const vendorLedgerColumns: DataTableColumn<VendorLedgerLine>[] = [
  {
    key: "date",
    header: "Date",
    headerClassName: "w-[120px]",
    cell: (row) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatShortDate(row.date) || ""}
      </span>
    ),
  },
  {
    key: "entryNumber",
    header: "Entry #",
    headerClassName: "w-[160px]",
    cell: (row) => (
      <Link
        href={`/accounting/journal/${row.entryId}`}
        className="font-mono text-xs text-foreground hover:text-primary hover:underline"
      >
        {row.entryNumber}
      </Link>
    ),
  },
  {
    key: "source",
    header: "Source",
    headerClassName: "w-[180px]",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatSource(row.sourceType, row.sourceEvent)}
      </span>
    ),
  },
  {
    key: "description",
    header: "Description",
    cell: (row) => (
      <span className="text-sm text-foreground">
        {row.billNumber ? (
          <Link
            href={`/accounting/purchase-bills/${row.billId}`}
            className="font-mono text-xs text-muted-foreground mr-2 hover:text-primary hover:underline"
          >
            {row.billNumber}
          </Link>
        ) : null}
        {row.description ?? ""}
      </span>
    ),
  },
  {
    key: "debit",
    header: "Debit",
    headerClassName: "w-[120px] text-right",
    className: "text-right font-mono text-sm tabular-nums text-destructive",
    cell: (row) => (
      <>{Number(row.debit) > 0 ? formatCurrency(row.debit) : "—"}</>
    ),
  },
  {
    key: "credit",
    header: "Credit",
    headerClassName: "w-[120px] text-right",
    className: "text-right font-mono text-sm tabular-nums text-status-success-ink",
    cell: (row) => (
      <>{Number(row.credit) > 0 ? formatCurrency(row.credit) : "—"}</>
    ),
  },
  {
    key: "runningBalance",
    header: "Running Balance",
    headerClassName: "w-[140px] text-right",
    className: "text-right font-mono text-sm font-medium tabular-nums",
    cell: (row) => <>{formatCurrency(row.runningBalance)}</>,
  },
];

function parseVendorId(value: string): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

interface VendorDetailPageProps {
  vendorId: string;
}

export function VendorDetailPage({ vendorId: vendorIdParam }: VendorDetailPageProps) {
  const vendorId = parseVendorId(vendorIdParam);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const query = useVendorLedger(vendorId, {
    from: from || undefined,
    to: to || undefined,
  });

  const handleFromChange = useCallback((value: string) => {
    setFrom(value);
  }, []);

  const handleToChange = useCallback((value: string): void => {
    setTo(value);
  }, []);

  const handleRetry = useCallback((): void => {
    void query.refetch();
  }, [query]);

  const summary = query.data?.summary;
  const lines = query.data?.lines ?? [];

  const subtitleParts: string[] = [];
  if (summary?.state) subtitleParts.push(summary.state);
  if (summary?.gstin) subtitleParts.push(`GSTIN ${summary.gstin}`);
  const subtitle =
    subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Vendor ledger";

  return (
    <PageWrapper
      title={
        summary?.vendorName ??
        (vendorId > 0 ? "Vendor ledger" : "Invalid vendor")
      }
      subtitle={subtitle}
      backHref="/accounting/vendors"
      backLabel="Back to vendors"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-6">
        <StatCardGrid cols={3}>
          <StatCard
            label="Total Billed"
            value={summary ? formatCurrency(summary.totalBilled) : "—"}
            icon={Receipt}
            color="blue"
            index={0}
          />
          <StatCard
            label="Total Paid"
            value={summary ? formatCurrency(summary.totalPaid) : "—"}
            icon={Wallet}
            color="green"
            index={1}
          />
          <StatCard
            label="Outstanding Payable"
            value={summary ? formatCurrency(summary.outstanding) : "—"}
            icon={AlertCircle}
            color={summary && Number(summary.outstanding) > 0 ? "red" : "green"}
            index={2}
          />
        </StatCardGrid>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="vendor-ledger-from"
              className="text-dense font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="vendor-ledger-from" value={from} onChange={handleFromChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="vendor-ledger-to"
              className="text-dense font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="vendor-ledger-to" value={to} onChange={handleToChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={12} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load ledger"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={lines}
            columns={vendorLedgerColumns}
            getRowKey={(row) =>
              `${row.entryId}-${row.entryNumber}-${row.debit}-${row.credit}`
            }
            emptyState={
              <EmptyState
                compact
                title="No ledger entries"
                description="No accounts-payable journal lines for this vendor in the selected range."
              />
            }
            minWidth="780px"
            className="flex-1 min-h-0"
          />
        )}
      </div>
    </PageWrapper>
  );
}
