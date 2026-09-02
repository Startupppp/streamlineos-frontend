"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { formatShortDate } from "@/lib/date-utils";
import { RecurringJournalsTab } from "@/features/accounting/core/recurring-journals-tab";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { cn } from "@/lib/utils";
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

const PAGE_SIZE = 25;

function parseSourceFilter(value: string | null): SourceFilter {
  if (value === "invoice" || value === "payment" || value === "manual") return value;
  return "ALL";
}

function parseStatusFilter(value: string | null): StatusFilter {
  if (
    value === "DRAFT" ||
    value === "PENDING_APPROVAL" ||
    value === "POSTED" ||
    value === "VOID"
  )
    return value;
  return "ALL";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sourceType = parseSourceFilter(searchParams.get("sourceType"));
  const statusFilter = parseStatusFilter(searchParams.get("status"));

  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const filterKey = `${from}|${to}|${sourceType}|${statusFilter}`;

  useEffect(() => {
    setCursors([null]);
    setCursorIndex(0);
  }, [filterKey]);

  const currentCursor = cursors[cursorIndex] ?? null;

  const canCreate = useCan("accounting:journal:create");

  const query = useJournal({
    limit: PAGE_SIZE,
    cursor: currentCursor ?? undefined,
    from: from || undefined,
    to: to || undefined,
    sourceType: sourceType === "ALL" ? undefined : sourceType,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  function setParam(key: string, value: string): void {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("cursor");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleFromChange(value: string): void {
    setParam("from", value);
  }

  function handleToChange(value: string): void {
    setParam("to", value);
  }

  function handleSourceTypeChange(value: string): void {
    setParam("sourceType", value === "ALL" ? "" : value);
  }

  function handleStatusChange(value: string): void {
    setParam("status", value === "ALL" ? "" : value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleClearFilters(): void {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("from");
      params.delete("to");
      params.delete("sourceType");
      params.delete("status");
      params.delete("cursor");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handlePreviousPage(): void {
    setCursorIndex(Math.max(0, cursorIndex - 1));
  }

  function handleNextPage(): void {
    const next = query.data?.pagination.nextCursor ?? null;
    setCursors((prev) => {
      const copy = prev.slice(0, cursorIndex + 1);
      copy.push(next);
      return copy;
    });
    setCursorIndex(cursorIndex + 1);
  }

  const items = query.data?.data ?? [];
  const hasMore = query.data?.pagination?.hasMore ?? false;

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
      cell: (entry) => formatShortDate(entry.entryDate),
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

  const filtersActive =
    from !== "" || to !== "" || sourceType !== "ALL" || statusFilter !== "ALL";

  const emptyStateNode = (
    <EmptyState
      illustration={<EmptyDocumentsIllustration />}
      title="No journal entries yet"
      description={
        filtersActive
          ? undefined
          : "Entries appear once invoices, payments, or manual journals post."
      }
      filtersActive={filtersActive}
      onClearFilters={handleClearFilters}
      action={
        canCreate && !filtersActive
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
      </div>

      {query.error ? (
        <ErrorState
          title="Failed to load journal"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : (
        <>
          <DataTable<JournalEntry>
            data={items}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={query.isLoading}
            emptyState={emptyStateNode}
            minWidth="580px"
            className="flex-1 min-h-0"
          />
          {(cursorIndex > 0 || hasMore) ? (
            <CursorPageControls
              page={cursorIndex + 1}
              hasNext={hasMore}
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
              className="mt-2"
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export function JournalPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const rawTab = searchParams.get("tab");
  const tab: TabValue = rawTab === "recurring" ? "recurring" : "entries";

  function handleEntriesTab(): void {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleRecurringTab(): void {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("tab", "recurring");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
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
        <div className="inline-flex h-9 w-full items-center gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto scrollbar-hide sm:w-fit">
          <button
            type="button"
            onClick={handleEntriesTab}
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
              tab === "entries"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Entries
          </button>
          <button
            type="button"
            onClick={handleRecurringTab}
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
              tab === "recurring"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Recurring
          </button>
        </div>

        {tab === "entries" ? <EntriesTab /> : <RecurringJournalsTab />}
      </div>
    </PageWrapper>
  );
}
