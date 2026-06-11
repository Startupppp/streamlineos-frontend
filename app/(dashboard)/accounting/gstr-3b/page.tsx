"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useGstr3B } from "@/lib/api/hooks/accounting";
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
      <TableCell className="text-right tabular-nums">{fmt(block.taxableValue)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt(block.cgst)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt(block.sgst)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmt(block.igst)}</TableCell>
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

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="GSTR-3B"
      subtitle="Consolidated monthly GST return summary. Outward minus ITC equals tax payable."
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
        <div>
          <label className="text-sm text-slate-600 block mb-1">From</label>
          <Input type="date" value={from} onChange={handleFromChange} />
        </div>
        <div>
          <label className="text-sm text-slate-600 block mb-1">To</label>
          <Input type="date" value={to} onChange={handleToChange} />
        </div>
      </div>

      {query.isLoading && <LoadingState variant="table" />}
      {query.error && <ErrorState description={query.error.message} />}

      {report && (
        <div className="space-y-4">
          <Card className="p-4 bg-slate-50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
              <div><div className="text-slate-600">Net CGST</div><div className="font-mono text-base">{fmt(report.netTaxPayable.cgst)}</div></div>
              <div><div className="text-slate-600">Net SGST</div><div className="font-mono text-base">{fmt(report.netTaxPayable.sgst)}</div></div>
              <div><div className="text-slate-600">Net IGST</div><div className="font-mono text-base">{fmt(report.netTaxPayable.igst)}</div></div>
              <div><div className="text-slate-600">Net tax payable</div><div className="font-mono text-base font-medium">{fmt(report.netTaxPayable.total)}</div></div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 font-medium bg-emerald-50 border-b border-emerald-200/60">
              3.1 Outward supplies
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Taxable value</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <BlockRow label="(a) Taxable outward supplies" block={report.outward.taxable} />
                <BlockRow label="(b) Zero-rated supplies" block={report.outward.zeroRated} />
                <BlockRow label="(c) Nil-rated / exempted" block={report.outward.nilExempted} />
                <BlockRow label="(d) Reverse charge" block={report.outward.reverseCharge} />
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-xs text-slate-600 border-t border-slate-200/60">
              {report.invoiceCount} invoice{report.invoiceCount === 1 ? "" : "s"} in period
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 font-medium bg-blue-50 border-b border-blue-200/60">
              4. Input Tax Credit (ITC)
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Taxable value</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <BlockRow label="(A) ITC available" block={report.itc.available} />
                <BlockRow label="(B) ITC reversed" block={report.itc.reversed} />
                <BlockRow label="(C) Net ITC available" block={report.itc.net} />
              </TableBody>
            </Table>
            <div className="px-4 py-2 text-xs text-slate-600 border-t border-slate-200/60">
              {report.billCount} purchase bill{report.billCount === 1 ? "" : "s"} in period
            </div>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
