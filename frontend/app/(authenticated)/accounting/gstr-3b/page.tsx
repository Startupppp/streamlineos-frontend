"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useGstr3B } from "@/hooks/api/accounting";
import type { Gstr3BTaxBlock } from "@/types/accounting";

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastOfMonth(): string {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

function fmt(value: string): string {
  return Number(value).toFixed(2);
}

function BlockRow({ label, block }: { label: string; block: Gstr3BTaxBlock }) {
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell className="text-right tabular-nums font-mono">
        {fmt(block.taxableValue)}
      </TableCell>
      <TableCell className="text-right tabular-nums font-mono">
        {fmt(block.cgst)}
      </TableCell>
      <TableCell className="text-right tabular-nums font-mono">
        {fmt(block.sgst)}
      </TableCell>
      <TableCell className="text-right tabular-nums font-mono">
        {fmt(block.igst)}
      </TableCell>
    </TableRow>
  );
}

export default function Gstr3BPage() {
  const [from, setFrom] = useState<string>(firstOfMonth());
  const [to, setTo] = useState<string>(lastOfMonth());
  const query = useGstr3B(from, to);
  const report = query.data;

  function handleFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setFrom(event.target.value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>): void {
    setTo(event.target.value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="GSTR-3B"
      subtitle="Consolidated monthly GST return summary. Outward minus ITC equals tax payable."
    >
      <div className="rounded-lg border border-border bg-muted/40 p-3 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div>
            <label
              htmlFor="gstr3b-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <Input
              id="gstr3b-from"
              type="date"
              value={from}
              onChange={handleFromChange}
              className="w-full sm:w-[160px] h-8 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="gstr3b-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <Input
              id="gstr3b-to"
              type="date"
              value={to}
              onChange={handleToChange}
              className="w-full sm:w-[160px] h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState variant="table" />
      ) : query.error ? (
        <ErrorState description={query.error.message} onRetry={handleRetry} />
      ) : !report ? (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="No GST data for this period"
          description="Post invoices and purchase bills within the date range to populate this return."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 bg-muted/40">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
              <div>
                <div className="text-muted-foreground">Net CGST</div>
                <div className="font-mono text-base">
                  {fmt(report.netTaxPayable.cgst)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Net SGST</div>
                <div className="font-mono text-base">
                  {fmt(report.netTaxPayable.sgst)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Net IGST</div>
                <div className="font-mono text-base">
                  {fmt(report.netTaxPayable.igst)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Net tax payable</div>
                <div className="font-mono text-base font-medium">
                  {fmt(report.netTaxPayable.total)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 font-medium bg-emerald-50 border-b border-emerald-200/60">
              3.1 Outward supplies
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Type</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Taxable value</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">CGST</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">SGST</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <BlockRow
                  label="(a) Taxable outward supplies"
                  block={report.outward.taxable}
                />
                <BlockRow
                  label="(b) Zero-rated supplies"
                  block={report.outward.zeroRated}
                />
                <BlockRow
                  label="(c) Nil-rated / exempted"
                  block={report.outward.nilExempted}
                />
                <BlockRow
                  label="(d) Reverse charge"
                  block={report.outward.reverseCharge}
                />
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-slate-200/60">
              {report.invoiceCount} invoice
              {report.invoiceCount === 1 ? "" : "s"} in period
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 font-medium bg-blue-50 border-b border-blue-200/60">
              4. Input Tax Credit (ITC)
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Type</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Taxable value</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">CGST</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">SGST</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <BlockRow
                  label="(A) ITC available"
                  block={report.itc.available}
                />
                <BlockRow
                  label="(B) ITC reversed"
                  block={report.itc.reversed}
                />
                <BlockRow
                  label="(C) Net ITC available"
                  block={report.itc.net}
                />
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-slate-200/60">
              {report.billCount} purchase bill
              {report.billCount === 1 ? "" : "s"} in period
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
