"use client";

import { useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Receipt, Wallet, AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
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
import { useCustomerLedger } from "@/lib/api/hooks/accounting";

function formatCurrency(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatSource(sourceType: string, sourceEvent: string | null): string {
  if (sourceEvent) return `${sourceType} · ${sourceEvent}`;
  return sourceType;
}

function parseClientId(value: string | string[] | undefined): number {
  if (typeof value !== "string") return 0;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export default function CustomerLedgerDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = parseClientId(params?.clientId);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const query = useCustomerLedger(clientId, {
    from: from ? from : undefined,
    to: to ? to : undefined,
  });

  function handleFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setFrom(event.target.value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>): void {
    setTo(event.target.value);
  }

  const summary = query.data?.summary;
  const lines = query.data?.lines ?? [];

  const subtitleParts: string[] = [];
  if (summary?.state) subtitleParts.push(summary.state);
  if (summary?.gstin) subtitleParts.push(`GSTIN ${summary.gstin}`);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Customer ledger";

  return (
    <PageWrapper
      eyebrow="Accounting · Customer"
      title={summary?.clientName ?? (clientId > 0 ? "Customer ledger" : "Invalid customer")}
      subtitle={subtitle}
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
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none"
            >
              From
            </label>
            <Input
              id="customer-ledger-from"
              type="date"
              value={from}
              onChange={handleFromChange}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="customer-ledger-to"
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none"
            >
              To
            </label>
            <Input
              id="customer-ledger-to"
              type="date"
              value={to}
              onChange={handleToChange}
              className="w-[160px]"
            />
          </div>
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load ledger"
            description={query.error.message}
          />
        ) : lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              No ledger entries
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              No accounts-receivable journal lines for this customer in the selected range.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[160px]">Entry #</TableHead>
                  <TableHead className="w-[180px]">Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px] text-right">Debit</TableHead>
                  <TableHead className="w-[120px] text-right">Credit</TableHead>
                  <TableHead className="w-[140px] text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={`${line.entryId}-${idx}`}>
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
                      {line.invoiceNumber ? (
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          {line.invoiceNumber}
                        </span>
                      ) : null}
                      {line.description ?? ""}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {Number(line.debit) > 0 ? formatCurrency(line.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {Number(line.credit) > 0 ? formatCurrency(line.credit) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
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
