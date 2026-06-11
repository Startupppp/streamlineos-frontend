"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { useJournal } from "@/lib/api/hooks/accounting";
import type { JournalEntryStatus } from "@/types/accounting";

type SourceFilter = "ALL" | "invoice" | "payment" | "manual";

const SOURCE_OPTIONS: ReadonlyArray<{ value: SourceFilter; label: string }> = [
  { value: "ALL", label: "All sources" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "manual", label: "Manual" },
];

const STATUS_VARIANT: Record<JournalEntryStatus, "default" | "secondary" | "destructive"> = {
  POSTED: "default",
  DRAFT: "secondary",
  VOID: "destructive",
};

function isSourceFilter(value: string): value is SourceFilter {
  return value === "ALL" || value === "invoice" || value === "payment" || value === "manual";
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

export default function JournalListPage() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [sourceType, setSourceType] = useState<SourceFilter>("ALL");

  const query = useJournal({
    page: 1,
    pageSize: 100,
    from: from ? from : undefined,
    to: to ? to : undefined,
    sourceType: sourceType === "ALL" ? undefined : sourceType,
  });

  function handleFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setFrom(event.target.value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>): void {
    setTo(event.target.value);
  }

  function handleSourceTypeChange(value: string): void {
    if (isSourceFilter(value)) {
      setSourceType(value);
    }
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Journal"
      subtitle="Every posted journal entry."
      badge={`${total}`}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="journal-from"
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none"
            >
              From
            </label>
            <Input
              id="journal-from"
              type="date"
              value={from}
              onChange={handleFromChange}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="journal-to"
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none"
            >
              To
            </label>
            <Input
              id="journal-to"
              type="date"
              value={to}
              onChange={handleToChange}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
              Source
            </span>
            <Select value={sourceType} onValueChange={handleSourceTypeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load journal"
            description={query.error.message}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              No journal entries yet.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Entries appear here once invoices, payments, or manual journals post.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Entry #</TableHead>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead className="w-[200px]">Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/accounting/journal/${entry.id}`}
                        className="text-foreground hover:text-blue-600 hover:underline"
                      >
                        {entry.entryNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(entry.entryDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSource(entry.sourceType, entry.sourceEvent)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {entry.description ?? ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[entry.status]}>
                        {entry.status}
                      </Badge>
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
