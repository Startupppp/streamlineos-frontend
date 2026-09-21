"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { CREDIT_NOTES_CREATE, CREDIT_NOTES_READ, useCreditNotes } from "@/hooks/api/accounting/ar";
import type { ArDocumentSummary } from "@/types/accounting-ar";
import { usePartyNames } from "../parties/use-party-names";
import { ArStatusBadge, DOCUMENT_STATUS_OPTIONS, isDocumentStatus } from "./ar-labels";
import { useListUrlState } from "./use-list-url-state";

export function CreditNotesPageClient() {
  const canCreate = useCan(CREDIT_NOTES_CREATE);
  const router = useRouter();
  const url = useListUrlState();
  const [search, setSearch] = useState(url.get("search"));
  const debouncedSearch = useDebouncedValue(search, 300);

  const statusParam = url.get("status");
  const status = isDocumentStatus(statusParam) ? statusParam : undefined;

  const creditNotesQuery = useCreditNotes({
    status,
    search: debouncedSearch || undefined,
    page: url.page,
    pageSize: url.pageSize,
  });

  const rows = creditNotesQuery.data?.items ?? [];
  const partyNames = usePartyNames(rows.map((row) => row.partyId));

  const columns: DataTableColumn<ArDocumentSummary>[] = [
    {
      key: "documentNumber",
      header: "Credit note",
      cell: (row) => (
        <Link
          href={`/accounting/credit-notes/${row.id}`}
          className="text-sm font-medium text-status-info-ink hover:underline"
        >
          {row.documentNumber ?? "Unissued draft"}
        </Link>
      ),
    },
    {
      key: "partyId",
      header: "Customer",
      cell: (row) => (
        <Link
          href={`/accounting/customers/${row.partyId}`}
          className="truncate text-sm text-status-info-ink hover:underline"
        >
          {partyNames.resolve(row.partyId)}
        </Link>
      ),
    },
    {
      key: "issueDate",
      header: "Issued",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{formatShortDate(row.issueDate)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ArStatusBadge status={row.status} />,
    },
    {
      key: "grossMinor",
      header: "Credited",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.grossMinor, row.currency)}
        </span>
      ),
    },
    {
      key: "openMinor",
      header: "Not yet applied",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense font-medium tabular-nums">
          {formatMinorMoney(row.openMinor, row.currency)}
        </span>
      ),
    },
  ];

  function handleSearchChange(value: string): void {
    setSearch(value);
    url.setParams({ search: value || undefined });
  }

  const pageState = usePageState({
    permission: CREDIT_NOTES_READ,
    isLoading: creditNotesQuery.isLoading,
    isError: creditNotesQuery.isError,
    error: creditNotesQuery.error,
  });
  const handleRetry = useCallback(() => { void creditNotesQuery.refetch(); }, [creditNotesQuery]);

  const hasFilters = debouncedSearch.length > 0 || statusParam.length > 0;

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search by number or reference…"
        value={search}
        onValueChange={handleSearchChange}
        className="min-w-0 flex-1 lg:max-w-md"
      />
      <Select
        value={statusParam || "all"}
        onValueChange={(value) => url.setParams({ status: value === "all" ? undefined : value })}
      >
        <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All credit notes</SelectItem>
          {DOCUMENT_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Credit notes">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Credit notes"
      subtitle="Money you have given back or written off."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      actions={
        canCreate ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => router.push("/accounting/credit-notes/new")}
          >
            New credit note
          </AnimatedIconButton>
        ) : null
      }
      filters={filters}
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={creditNotesQuery.isLoading}
        minWidth="900px"
        className="flex-1 min-h-0"
        emptyState={
          <EmptyState
            className="border-0 bg-transparent min-h-[40vh]"
            illustrationPreset="documents"
            title="No credit notes yet"
            description="When you need to correct a posted invoice, the credit note lands here."
            action={canCreate ? { label: "New credit note", href: "/accounting/credit-notes/new" } : undefined}
            filtersActive={hasFilters}
            onClearFilters={() => url.setParams({ search: undefined, status: undefined })}
          />
        }
        pagination={{
          mode: "server",
          page: url.page,
          pageSize: url.pageSize,
          total: creditNotesQuery.data?.total ?? 0,
          onPageChange: url.setPage,
          onPageSizeChange: url.setPageSize,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />
    </PageWrapper>
  );
}
