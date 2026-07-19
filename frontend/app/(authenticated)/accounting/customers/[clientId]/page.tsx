"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Receipt, Wallet, AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useCustomerLedger } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CustomerLedgerLine } from "@/types/accounting";

interface CustomerLedgerDetailPageProps {
  params: Promise<{ clientId: string }>;
}

function formatCurrency(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatSource(sourceType: string, sourceEvent: string | null): string {
  if (sourceEvent) return `${sourceType} · ${sourceEvent}`;
  return sourceType;
}

const customerLedgerColumns: DataTableColumn<CustomerLedgerLine>[] = [
  {
    key: "date",
    header: "Date",
    headerClassName: "w-[120px]",
    cell: (row) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.date)}
      </span>
    ),
  },
  {
    key: "entryNumber",
    header: "Entry #",
    headerClassName: "w-[150px]",
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
    key: "invoice",
    header: "Invoice",
    headerClassName: "w-[80px]",
    cell: (row) =>
      row.invoiceNumber ? (
        <Link
          href={`/accounting/invoices/${row.invoiceId}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.invoiceNumber}
        </Link>
      ) : (
        <span className="font-mono text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "source",
    header: "Source",
    headerClassName: "w-[200px]",
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
      <span className="text-sm text-foreground">{row.description ?? ""}</span>
    ),
  },
  {
    key: "debit",
    header: "Debit",
    headerClassName: "w-[120px] text-right",
    className: "text-right font-mono text-sm tabular-nums text-destructive",
    cell: (row) =>
      Number(row.debit) > 0 ? formatCurrency(row.debit) : "—",
  },
  {
    key: "credit",
    header: "Credit",
    headerClassName: "w-[120px] text-right",
    className: "text-right font-mono text-sm tabular-nums text-emerald-600",
    cell: (row) =>
      Number(row.credit) > 0 ? formatCurrency(row.credit) : "—",
  },
  {
    key: "runningBalance",
    header: "Running Balance",
    headerClassName: "w-[140px] text-right",
    className: "text-right font-mono text-sm font-medium tabular-nums",
    cell: (row) => formatCurrency(row.runningBalance),
  },
];

export default function CustomerLedgerDetailPage({
  params,
}: CustomerLedgerDetailPageProps) {
  const { clientId: clientIdStr } = use(params);
  const clientId = Number(clientIdStr);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const query = useCustomerLedger(clientId, {
    from: from || undefined,
    to: to || undefined,
  });

  const handleFromChange = useCallback((value: string): void => {
    setFrom(value);
  }, []);

  const handleToChange = useCallback((value: string): void => {
    setTo(value);
  }, []);

  function handleRetry(): void {
    void query.refetch();
  }

  const summary = query.data?.summary;
  const lines = query.data?.lines ?? [];

  const subtitleParts: string[] = [];
  if (summary?.state) subtitleParts.push(summary.state);
  if (summary?.gstin) subtitleParts.push(`GSTIN ${summary.gstin}`);
  const subtitle =
    subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Customer ledger";

  return (
    <PageWrapper
      title={
        summary?.clientName ??
        (clientId > 0 ? "Customer ledger" : "Invalid customer")
      }
      subtitle={subtitle}
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounting/customers">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <StatCardGrid cols={3}>
          <StatCard
            label="Total Invoiced"
            value={summary ? formatCurrency(summary.totalInvoiced) : "—"}
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
            label="Outstanding"
            value={summary ? formatCurrency(summary.outstanding) : "—"}
            icon={AlertCircle}
            color={summary && Number(summary.outstanding) > 0 ? "red" : "green"}
            index={2}
          />
        </StatCardGrid>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="customer-ledger-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="customer-ledger-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="customer-ledger-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="customer-ledger-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-[160px]" />
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
            columns={customerLedgerColumns}
            getRowKey={(row) =>
              `${row.entryId}-${row.entryNumber}-${row.debit}-${row.credit}`
            }
            emptyState={
              <EmptyState
                compact
                title="No ledger entries"
                description="No accounts-receivable journal lines for this customer in the selected range."
              />
            }
            minWidth="780px"
          />
        )}
      </div>
    </PageWrapper>
  );
}
