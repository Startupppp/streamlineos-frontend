"use client";

import { use, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useVendorLedger } from "@/lib/api/hooks/accounting";

interface VendorLedgerPageProps {
  params: Promise<{ vendorId: string }>;
}

function fmt(value: string): string {
  return Number(value).toFixed(2);
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function VendorLedgerPage({ params }: VendorLedgerPageProps) {
  const { vendorId } = use(params);
  const id = Number(vendorId);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const query = useVendorLedger(id, { from: from || undefined, to: to || undefined });

  function handleFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setFrom(event.target.value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>): void {
    setTo(event.target.value);
  }

  if (query.isLoading) return <LoadingState variant="form" />;
  if (query.error) return <ErrorState description={query.error.message} />;
  if (!query.data) return <ErrorState title="Not found" description={`Vendor #${vendorId}`} />;

  const { summary, lines } = query.data;
  const outstanding = Number(summary.outstanding);
  const dateFilteredLines = lines.filter((l) => {
    if (from && l.date < from) return false;
    if (to && l.date > to) return false;
    return true;
  });

  return (
    <PageWrapper
      eyebrow="Accounting · Vendor"
      title={summary.vendorName}
      subtitle={`${summary.state ?? "—"} · ${summary.gstin ?? "No GSTIN"}`}
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounting/vendors">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-sm text-slate-600">Total billed</div>
            <div className="text-xl font-mono tabular-nums">{fmt(summary.totalBilled)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600">Total paid</div>
            <div className="text-xl font-mono tabular-nums">{fmt(summary.totalPaid)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600">Outstanding</div>
            <div className={`text-xl font-mono tabular-nums ${outstanding > 0 ? "text-rose-600 font-medium" : ""}`}>
              {fmt(summary.outstanding)}
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="text-sm text-slate-600 block mb-1">From</label>
            <Input type="date" value={from} onChange={handleFromChange} />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">To</label>
            <Input type="date" value={to} onChange={handleToChange} />
          </div>
        </div>

        {dateFilteredLines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600">
            No AP journal lines for this vendor in the selected range.
          </div>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Running balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dateFilteredLines.map((line, idx) => (
                  <TableRow key={`${line.entryId}-${idx}`}>
                    <TableCell>{formatDate(line.date)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/accounting/journal/${line.entryId}`} className="text-blue-600 hover:underline">
                        {line.entryNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {line.billNumber ? (
                        <Link href={`/accounting/purchase-bills/${line.billId}`} className="text-blue-600 hover:underline font-mono text-xs">
                          {line.billNumber}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {line.sourceType}{line.sourceEvent ? ` · ${line.sourceEvent}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(line.debit) > 0 ? fmt(line.debit) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(line.credit) > 0 ? fmt(line.credit) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(line.runningBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
