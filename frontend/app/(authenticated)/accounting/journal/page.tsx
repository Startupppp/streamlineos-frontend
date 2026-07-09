"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useJournal } from "@/hooks/api/accounting";
import type { JournalEntryStatus } from "@/types/accounting";

type SourceFilter = "ALL" | "invoice" | "payment" | "manual";

const SOURCE_OPTIONS: ReadonlyArray<{ value: SourceFilter; label: string }> = [
  { value: "ALL", label: "All sources" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "manual", label: "Manual" },
];

const STATUS_VARIANT: Record<
  JournalEntryStatus,
  "default" | "secondary" | "destructive"
> = {
  POSTED: "default",
  DRAFT: "secondary",
  VOID: "destructive",
};

function isSourceFilter(value: string): value is SourceFilter {
  return (
    value === "ALL" ||
    value === "invoice" ||
    value === "payment" ||
    value === "manual"
  );
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

  function handleFromChange(value: string): void {
    setFrom(value);
  }

  function handleToChange(value: string): void {
    setTo(value);
  }

  function handleSourceTypeChange(value: string): void {
    if (isSourceFilter(value)) {
      setSourceType(value);
    }
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Journal"
      subtitle="Every posted journal entry."
      badge={`${total}`}
      actions={
        <Button size="sm" asChild>
          <Link href="/accounting/journal/new">
            <Plus className="size-4 mr-1" />
            New entry
          </Link>
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="journal-from"
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              From
            </label>
            <DatePicker id="journal-from" value={from ?? ""} onChange={handleFromChange} placeholder="Pick a date" className="h-8 text-xs w-[150px]" />
          </div>
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="journal-to"
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              To
            </label>
            <DatePicker id="journal-to" value={to ?? ""} onChange={handleToChange} placeholder="Pick a date" className="h-8 text-xs w-[150px]" />
          </div>
          <Select value={sourceType} onValueChange={handleSourceTypeChange}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
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
      }
    >
      {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load journal"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-600 mb-3">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              No journal entries yet.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Entries appear here once invoices, payments, or manual journals
              post.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/accounting/journal/new">
                <Plus className="mr-2 h-4 w-4" />
                New entry
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[580px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px]">
                      Entry #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[140px]">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[200px] hidden md:table-cell">
                      Source
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                      Description
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px]">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <TableCell className="font-mono text-xs px-3 py-2">
                        <Link
                          href={`/accounting/journal/${entry.id}`}
                          className="text-foreground hover:text-violet-600 hover:underline"
                        >
                          {entry.entryNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums px-3 py-2">
                        {formatDate(entry.entryDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {formatSource(entry.sourceType, entry.sourceEvent)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground px-3 py-2 hidden md:table-cell">
                        {entry.description ?? ""}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge
                          variant={STATUS_VARIANT[entry.status]}
                          className="text-xs px-1.5 py-0.5 rounded-md"
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
    </PageWrapper>
  );
}
