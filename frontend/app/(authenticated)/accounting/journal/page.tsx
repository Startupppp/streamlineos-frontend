"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DatePicker } from "@/components/ui/date-picker";
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
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { useJournal } from "@/hooks/api/accounting";
import { useSubmitJournalApproval } from "@/hooks/api/accounting/core";
import { getErrorMessage } from "@/lib/get-error-message";
import { RecurringJournalsTab } from "@/features/accounting/core/recurring-journals-tab";
import type { JournalEntryStatus } from "@/types/accounting";

type TabValue = "entries" | "recurring";
type SourceFilter = "ALL" | "invoice" | "payment" | "manual";
type StatusFilter = "ALL" | JournalEntryStatus;

const SOURCE_OPTIONS: ReadonlyArray<{ value: SourceFilter; label: string }> = [
  { value: "ALL", label: "All sources" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "manual", label: "Manual" },
];

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "POSTED", label: "Posted" },
  { value: "VOID", label: "Void" },
];

function isSourceFilter(value: string): value is SourceFilter {
  return (
    value === "ALL" ||
    value === "invoice" ||
    value === "payment" ||
    value === "manual"
  );
}

function isStatusFilter(value: string): value is StatusFilter {
  return (
    value === "ALL" ||
    value === "DRAFT" ||
    value === "PENDING_APPROVAL" ||
    value === "POSTED" ||
    value === "VOID"
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

interface SubmitApprovalButtonProps {
  entryId: number;
}

function SubmitApprovalButton({ entryId }: SubmitApprovalButtonProps) {
  const submitMutation = useSubmitJournalApproval(entryId);

  function handleSubmit(): void {
    submitMutation.mutate(undefined, {
      onSuccess: () => toast.success("Submitted for approval"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs px-2"
      onClick={handleSubmit}
      disabled={submitMutation.isPending}
    >
      {submitMutation.isPending ? "Submitting…" : "Submit"}
    </Button>
  );
}

function EntriesTab() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [sourceType, setSourceType] = useState<SourceFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const query = useJournal({
    page: 1,
    pageSize: 100,
    from: from || undefined,
    to: to || undefined,
    sourceType: sourceType === "ALL" ? undefined : sourceType,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  function handleFromChange(value: string): void {
    setFrom(value);
  }

  function handleToChange(value: string): void {
    setTo(value);
  }

  function handleSourceTypeChange(value: string): void {
    if (isSourceFilter(value)) setSourceType(value);
  }

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatusFilter(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor="journal-from" className="text-xs text-muted-foreground whitespace-nowrap">
            From
          </label>
          <DatePicker
            id="journal-from"
            value={from}
            onChange={handleFromChange}
            placeholder="Pick a date"
            className="h-8 text-xs w-[150px]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor="journal-to" className="text-xs text-muted-foreground whitespace-nowrap">
            To
          </label>
          <DatePicker
            id="journal-to"
            value={to}
            onChange={handleToChange}
            placeholder="Pick a date"
            className="h-8 text-xs w-[150px]"
          />
        </div>
        <Select value={sourceType} onValueChange={handleSourceTypeChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
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
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {total > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{total} entries</span>
        )}
      </div>

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
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600 mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No journal entries yet.</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {statusFilter !== "ALL" || sourceType !== "ALL"
              ? "Try different filters."
              : "Entries appear here once invoices, payments, or manual journals post."}
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[130px]">
                    Status
                  </TableHead>
                  <TableHead className="w-[100px] px-3 py-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((entry) => (
                  <TableRow key={entry.id} className="border-b border-border/50 hover:bg-muted/30">
                    <TableCell className="font-mono text-xs px-3 py-2">
                      <Link
                        href={`/accounting/journal/${entry.id}`}
                        className="text-foreground hover:text-blue-600 hover:underline"
                      >
                        {entry.entryNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums px-3 py-2">
                      {formatDate(entry.entryDate)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground px-3 py-2 hidden md:table-cell">
                      {entry.description ?? ""}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <FinanceStatusBadge status={entry.status} size="row" />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {entry.status === "DRAFT" && (
                        <SubmitApprovalButton entryId={entry.id} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JournalListPage() {
  const [tab, setTab] = useState<TabValue>("entries");

  function handleEntriesTab(): void {
    setTab("entries");
  }

  function handleRecurringTab(): void {
    setTab("recurring");
  }

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Journal"
      subtitle="Posted journal entries and recurring templates."
      actions={
        tab === "entries" ? (
          <Button size="sm" asChild>
            <Link href="/accounting/journal/new">
              <Plus className="size-4 mr-1" />
              New entry
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex border-b border-border gap-1">
          <button
            type="button"
            onClick={handleEntriesTab}
            className={`px-3 pb-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "entries"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Entries
          </button>
          <button
            type="button"
            onClick={handleRecurringTab}
            className={`px-3 pb-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "recurring"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Recurring
          </button>
        </div>

        {tab === "entries" ? <EntriesTab /> : <RecurringJournalsTab />}
      </div>
    </PageWrapper>
  );
}
