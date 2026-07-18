"use client";

import { useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { useGstr1 } from "@/hooks/api/accounting";
import { getErrorMessage } from "@/lib/get-error-message";
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
  const valueTone =
    tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground leading-none">
        {label}
      </span>
      <span
        className={`font-mono tabular-nums text-base font-semibold ${valueTone}`}
      >
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
        <TableRow key={`${place.placeOfSupply ?? "unk"}-${rate.gstRate}`} className="border-b border-border/50 hover:bg-muted/30">
          {index === 0 ? (
            <TableCell
              rowSpan={rateCount}
              className="align-top text-sm text-foreground font-medium"
            >
              {formatPlace(place)}
            </TableCell>
          ) : null}
          <TableCell className="text-sm text-foreground font-mono">
            {formatRate(rate.gstRate)}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums font-mono">
            {rate.taxableValue}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums font-mono">
            {rate.cgst}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums font-mono">
            {rate.sgst}
          </TableCell>
          <TableCell className="text-sm text-right tabular-nums font-mono">
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

function SectionTable({
  title,
  description,
  tint,
  section,
}: SectionTableProps) {
  const tintClass =
    tint === "b2b"
      ? "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10"
      : "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
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
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Place of supply</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">GST rate</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Taxable value</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">CGST</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">SGST</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">IGST</TableHead>
                <TableHead className="w-[90px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Invoices</TableHead>
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
                <TableCell className="text-sm text-right tabular-nums font-mono">
                  {section.totalTaxableValue}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums font-mono">
                  {section.totalCgst}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums font-mono">
                  {section.totalSgst}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums font-mono">
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

  function handleFromChange(value: string): void {
    setFrom(value);
  }

  function handleToChange(value: string): void {
    setTo(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const report = query.data;
  const hasAnyRows =
    !!report && (report.b2b.places.length > 0 || report.b2c.places.length > 0);

  return (
    <PageWrapper
      title="GSTR-1 Summary"
      subtitle="Outward supplies for the selected period."
      filters={
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="gstr1-from"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              From
            </label>
            <DatePicker id="gstr1-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="w-full sm:w-[160px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="gstr1-to"
              className="text-[11px] font-medium text-muted-foreground leading-none"
            >
              To
            </label>
            <DatePicker id="gstr1-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="w-full sm:w-[160px]" />
          </div>
        </div>
      }
    >
      {query.isLoading ? (
          <LoadingState variant="table" rows={12} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load GSTR-1"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : !report || !hasAnyRows ? (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No outward supplies in the selected period"
            description="Issue invoices marked ISSUED, PAID, or FAILED within the date range to populate this report."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Grand total
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <SummaryStat
                  label="Taxable value"
                  value={report.grandTotal.taxableValue}
                />
                <SummaryStat label="CGST" value={report.grandTotal.cgst} />
                <SummaryStat label="SGST" value={report.grandTotal.sgst} />
                <SummaryStat label="IGST" value={report.grandTotal.igst} />
                <SummaryStat
                  label="Invoices"
                  value={report.grandTotal.invoices}
                  tone="muted"
                />
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
    </PageWrapper>
  );
}
