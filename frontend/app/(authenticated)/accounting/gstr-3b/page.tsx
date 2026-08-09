"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
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
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useGstr3B } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
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

  function handleFromChange(value: string): void {
    setFrom(value);
  }

  function handleToChange(value: string): void {
    setTo(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      title="GSTR-3B"
      subtitle="Consolidated monthly GST return summary. Outward minus ITC equals tax payable."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="gstr3b-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="gstr3b-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="gstr3b-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="gstr3b-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-[160px]" />
          </div>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {query.isLoading ? (
          <LoadingState variant="table" />
        ) : query.error ? (
          <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
        ) : !report ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No GST data for this period"
            description="Post invoices and purchase bills within the date range to populate this return."
          />
        ) : (
          <>
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
            <div className="px-4 py-3 font-medium bg-emerald-500/10 text-emerald-700 border-b border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
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
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              {report.invoiceCount} invoice
              {report.invoiceCount === 1 ? "" : "s"} in period
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 font-medium bg-primary/5 border-b border-primary/20">
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
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              {report.billCount} purchase bill
              {report.billCount === 1 ? "" : "s"} in period
            </div>
          </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
