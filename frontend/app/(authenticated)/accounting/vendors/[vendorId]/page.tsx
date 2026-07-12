"use client";

import { use, useState, useCallback, type ChangeEvent } from "react";
import Link from "next/link";
import { Receipt, Wallet, AlertCircle, ArrowLeft } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
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
import { useVendorLedger } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";

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

function parseVendorId(value: string): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

interface PageProps {
  params: Promise<{ vendorId: string }>;
}

export default function VendorLedgerDetailPage({ params }: PageProps) {
  const { vendorId: vendorIdParam } = use(params);
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
      eyebrow="Accounting · Vendors"
      title={
        summary?.vendorName ??
        (vendorId > 0 ? "Vendor ledger" : "Invalid vendor")
      }
      subtitle={subtitle}
    >
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <Link href="/accounting/vendors">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to vendors
            </Link>
          </Button>
        </div>

        <div className={DS.gridResponsive3}>
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
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="vendor-ledger-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="vendor-ledger-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-full sm:w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="vendor-ledger-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="vendor-ledger-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-full sm:w-[160px]" />
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
              No accounts-payable journal lines for this vendor in the selected
              range.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px]">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px]">Entry #</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[180px]">Source</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSource(line.sourceType, line.sourceEvent)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {line.billNumber ? (
                        <Link
                          href={`/accounting/purchase-bills/${line.billId}`}
                          className="font-mono text-xs text-muted-foreground mr-2 hover:text-blue-600 hover:underline"
                        >
                          {line.billNumber}
                        </Link>
                      ) : null}
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
