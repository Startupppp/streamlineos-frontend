"use client";

import { use, useState, useCallback, type ChangeEvent } from "react";
import Link from "next/link";
import { ChevronLeft, Receipt, Wallet, AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { DS } from "@/lib/design-system";
import { useCustomerLedger } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

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
      eyebrow="Accounting · Customer"
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
        <div className={DS.gridResponsive3}>
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
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="customer-ledger-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="customer-ledger-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-full sm:w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="customer-ledger-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="customer-ledger-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-full sm:w-[160px]" />
          </div>
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load ledger"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              No ledger entries
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              No accounts-receivable journal lines for this customer in the
              selected range.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
            <Table className="min-w-[780px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px]">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[150px]">Entry #</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[80px]">Invoice</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[200px]">Source</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px] text-right">Debit</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px] text-right">Credit</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[140px] text-right">
                    Running Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={`${line.entryId}-${idx}`} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(line.date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/accounting/journal/${line.entryId}`}
                        className="text-foreground hover:text-blue-600 hover:underline"
                      >
                        {line.entryNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {line.invoiceNumber ? (
                        <Link
                          href={`/accounting/invoices/${line.invoiceId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {line.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSource(line.sourceType, line.sourceEvent)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {line.description ?? ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums text-destructive">
                      {Number(line.debit) > 0
                        ? formatCurrency(line.debit)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums text-emerald-600">
                      {Number(line.credit) > 0
                        ? formatCurrency(line.credit)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium tabular-nums">
                      {formatCurrency(line.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
