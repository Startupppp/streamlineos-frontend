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
import { LoadingState, ErrorState } from "@/components/shared";
import { useGstr1 } from "@/lib/api/hooks/accounting";
import type {
  Gstr1PlaceBucket,
  Gstr1RateBucket,
  Gstr1Section1,
} from "@/types/accounting";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

function lastOfMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;
}

function formatRate(rate: string): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return rate;
  return `${n.toFixed(2)}%`;
}

function formatPlace(place: Gstr1PlaceBucket): string {
  if (!place.placeOfSupply) return "Unspecified";
  if (place.placeName) return `${place.placeOfSupply} - ${place.placeName}`;
  return place.placeOfSupply;
}

function totalRateCount(place: Gstr1PlaceBucket): number {
  return place.rates.length;
}

interface SummaryStatProps {
  label: string;
  value: string | number;
  tone?: "default" | "muted";
}

function SummaryStat({ label, value, tone = "default" }: SummaryStatProps) {
  const valueTone = tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground leading-none">
        {label}
      </span>
      <span className={`font-mono tabular-nums text-base font-semibold ${valueTone}`}>
        {value}
      </span>
    </div>
  );
}

interface RateRowsProps {
  place: Gstr1PlaceBucket;
}

function RateRows({ place }: RateRowsProps) {
  const rateCount = totalRateCount(place);
  return (
    <>
      {place.rates.map((rate: Gstr1RateBucket, index: number) => (
        <TableRow key={`${place.placeOfSupply ?? "unk"}-${rate.gstRate}`}>
          {index === 0 ? (
            <TableCell rowSpan={rateCount} className="align-top text-sm text-foreground font-medium">
              {formatPlace(place)}
            </TableCell>
          ) : null}
          <TableCell className="text-sm text-foreground font-mono">
            {formatRate(rate.gstRate)}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums">
            {rate.taxableValue}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums">
            {rate.cgst}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums">
            {rate.sgst}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums">
            {rate.igst}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums">
            {rate.invoiceCount}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

interface SectionTableProps {
  title: string;
  description: string;
  tint: "b2b" | "b2c";
  section: Gstr1Section1;
}

function SectionTable({ title, description, tint, section }: SectionTableProps) {
  const tintClass =
    tint === "b2b"
      ? "bg-violet-500/10 text-violet-700 border-violet-500/20"
      : "bg-amber-500/10 text-amber-700 border-amber-500/20";

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className={`px-4 py-2.5 border-b ${tintClass}`}>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-xs opacity-80 mt-0.5">{description}</p>
      </div>
      {section.places.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} supplies in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Place of supply</TableHead>
              <TableHead className="w-[100px]">GST rate</TableHead>
              <TableHead className="text-right">Taxable value</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="w-[90px] text-right">Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.places.map((place) => (
              <RateRows key={place.placeOfSupply ?? "unk"} place={place} />
            ))}
            <TableRow className="font-semibold bg-muted/30">
              <TableCell colSpan={2} className="text-sm">
                Section total
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {section.totalTaxableValue}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {section.totalCgst}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {section.totalSgst}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {section.totalIgst}
              </TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {section.totalInvoices}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}

export default function Gstr1Page() {
  const [from, setFrom] = useState<string>(firstOfMonth());
  const [to, setTo] = useState<string>(lastOfMonth());

  const query = useGstr1(from, to);

  function handleFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setFrom(event.target.value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>): void {
    setTo(event.target.value);
  }

  const report = query.data;
  const hasAnyRows =
    !!report && (report.b2b.places.length > 0 || report.b2c.places.length > 0);

  return (
    <PageWrapper
      eyebrow="Accounting · Reports"
      title="GSTR-1 Summary"
      subtitle="Outward supplies for the selected period."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="gstr1-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <Input
              id="gstr1-from"
              type="date"
              value={from}
              onChange={handleFromChange}
              className="w-full sm:w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="gstr1-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <Input
              id="gstr1-to"
              type="date"
              value={to}
              onChange={handleToChange}
              className="w-full sm:w-[160px]"
            />
          </div>
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load GSTR-1"
            description={query.error.message}
          />
        ) : !report || !hasAnyRows ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              No outward supplies in the selected period.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Issue invoices marked SENT, PAID, or OVERDUE within the date range to populate this report.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Grand total</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <SummaryStat label="Taxable value" value={report.grandTotal.taxableValue} />
                <SummaryStat label="CGST" value={report.grandTotal.cgst} />
                <SummaryStat label="SGST" value={report.grandTotal.sgst} />
                <SummaryStat label="IGST" value={report.grandTotal.igst} />
                <SummaryStat label="Invoices" value={report.grandTotal.invoices} tone="muted" />
              </div>
            </div>

            <SectionTable
              title="B2B"
              description="Business to Business (customer has GSTIN)."
              tint="b2b"
              section={report.b2b}
            />
            <SectionTable
              title="B2C"
              description="Business to Consumer (no GSTIN on invoice)."
              tint="b2c"
              section={report.b2c}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
