"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { useJournal } from "@/hooks/api/accounting";
import { useSubmitJournalApproval } from "@/hooks/api/accounting/core";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { RecurringJournalsTab } from "@/features/accounting/core/recurring-journals-tab";
import type { JournalEntry, JournalEntryStatus } from "@/types/accounting";

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
    <LoadingButton
      variant="ghost"
      size="sm"
      className="h-6 text-xs px-2"
      isPending={submitMutation.isPending}
      loadingText="Submitting…"
      onClick={handleSubmit}
    >
      Submit
    </LoadingButton>
  );
}

function EntriesTab() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [sourceType, setSourceType] = useState<SourceFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const canCreate = useCan("accounting:journal:create");

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

  const columns: DataTableColumn<JournalEntry>[] = [
    {
      key: "entryNumber",
      header: "Entry #",
      headerClassName: "w-[160px]",
      className: "font-mono text-xs",
      cell: (entry) => (
        <Link
          href={`/accounting/journal/${entry.id}`}
          className="text-foreground hover:text-primary hover:underline"
        >
          {entry.entryNumber}
        </Link>
      ),
    },
    {
      key: "entryDate",
      header: "Date",
      headerClassName: "w-[140px]",
      className: "text-sm text-muted-foreground tabular-nums",
      cell: (entry) => formatDate(entry.entryDate),
    },
    {
      key: "description",
      header: "Description",
      className: "text-sm hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (entry) => entry.description ?? "",
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[130px]",
      cell: (entry) => <FinanceStatusBadge status={entry.status} size="row" />,
    },
    {
      key: "action",
      header: "",
      headerClassName: "w-[100px]",
      className: "text-right",
      cell: (entry) =>
        entry.status === "DRAFT" ? (
          <SubmitApprovalButton entryId={entry.id} />
        ) : null,
    },
  ];

  const emptyStateNode = (
    <EmptyState
      illustration={<EmptyDocumentsIllustration />}
      title="No journal entries yet"
      description={
        statusFilter !== "ALL" || sourceType !== "ALL"
          ? "Try different filters."
          : "Entries appear once invoices, payments, or manual journals post."
      }
      action={
        canCreate
          ? { label: "New entry", href: "/accounting/journal/new" }
          : undefined
      }
    />
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className={FILTER_TOOLBAR_ROW}>
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="journal-from"
            className="text-xs text-muted-foreground whitespace-nowrap"
          >
            From
          </label>
          <DatePicker
            id="journal-from"
            value={from}
            onChange={handleFromChange}
            placeholder="Pick a date"
            className="w-[150px]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="journal-to"
            className="text-xs text-muted-foreground whitespace-nowrap"
          >
            To
          </label>
          <DatePicker
            id="journal-to"
            value={to}
            onChange={handleToChange}
            placeholder="Pick a date"
            className="w-[150px]"
          />
        </div>
        <Select value={sourceType} onValueChange={handleSourceTypeChange}>
          <SelectTrigger className={`w-[140px] ${FILTER_SELECT_TRIGGER}`}>
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
          <SelectTrigger className={`w-[160px] ${FILTER_SELECT_TRIGGER}`}>
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
          <span className="text-xs text-muted-foreground ml-auto">
            {total} entries
          </span>
        )}
      </div>

      {query.error ? (
        <ErrorState
          title="Failed to load journal"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable<JournalEntry>
          data={items}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={query.isLoading}
          emptyState={emptyStateNode}
          minWidth="580px"
          className="flex-1 min-h-0"
        />
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
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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
