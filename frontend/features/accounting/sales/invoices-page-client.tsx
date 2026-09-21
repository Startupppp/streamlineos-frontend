"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
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
import {
  RECEIVABLES_MANAGE,
  RECEIVABLES_READ,
  useArAging,
  useArInvoices,
} from "@/hooks/api/accounting/ar";
import type { ArDocumentSummary } from "@/types/accounting-ar";
import { usePartyNames } from "../parties/use-party-names";
import { ArStatusBadge, DOCUMENT_STATUS_OPTIONS, isDocumentStatus } from "./ar-labels";
import { useListUrlState } from "./use-list-url-state";

export function InvoicesPageClient() {
  const canManage = useCan(RECEIVABLES_MANAGE);
  const router = useRouter();
  const url = useListUrlState();
  const [search, setSearch] = useState(url.get("search"));
  const debouncedSearch = useDebouncedValue(search, 300);

  const statusParam = url.get("status");
  const status = isDocumentStatus(statusParam) ? statusParam : undefined;
  const openOnly = url.get("open") === "true";

  const invoicesQuery = useArInvoices({
    status,
    openOnly,
    search: debouncedSearch || undefined,
    page: url.page,
    pageSize: url.pageSize,
  });
  const agingQuery = useArAging({});

  const pageState = usePageState({
    permission: RECEIVABLES_READ,
    isLoading: invoicesQuery.isLoading,
    isError: invoicesQuery.isError,
    error: invoicesQuery.error,
  });
  const handleRetry = useCallback(() => { void invoicesQuery.refetch(); }, [invoicesQuery]);

  const rows = invoicesQuery.data?.items ?? [];
  const partyNames = usePartyNames(rows.map((row) => row.partyId));

  const columns: DataTableColumn<ArDocumentSummary>[] = [
    {
      key: "documentNumber",
      header: "Invoice",
      cell: (row) => (
        <Link
          href={`/accounting/invoices/${row.id}`}
          className="text-sm font-medium text-status-info-ink hover:underline"
        >
          {row.documentNumber ?? "Unsent draft"}
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
      key: "dueDate",
      header: "Due",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {row.dueDate ? formatShortDate(row.dueDate) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ArStatusBadge status={row.status} />,
    },
    {
      key: "grossMinor",
      header: "Total",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">
          {formatMinorMoney(row.grossMinor, row.currency)}
        </span>
      ),
    },
    {
      key: "openMinor",
      header: "Still owed",
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

  const hasFilters = debouncedSearch.length > 0 || statusParam.length > 0 || openOnly;
  const aging = agingQuery.data;

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search by invoice number or reference…"
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
          <SelectItem value="all">All invoices</SelectItem>
          {DOCUMENT_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={openOnly ? "true" : "any"}
        onValueChange={(value) => url.setParams({ open: value === "any" ? undefined : value })}
      >
        <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Balance">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="any">Any balance</SelectItem>
          <SelectItem value="true">Still owed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Invoices">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Invoices"
      subtitle="What you have billed, and what is still to come in."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => router.push("/accounting/invoices/new")}
          >
            New invoice
          </AnimatedIconButton>
        ) : null
      }
      filters={filters}
    >
      <StatCardGrid cols={3} className="shrink-0 mb-2">
        <StatCard
          label="Customers owe us"
          value={aging ? formatMinorMoney(aging.totals.functionalTotalMinor, aging.baseCurrency) : "—"}
          tone="amber"
          isLoading={agingQuery.isLoading}
          href="/accounting/aged-receivables"
        />
        <StatCard
          label="Overdue 91+ days"
          value={aging ? formatMinorMoney(aging.totals.days91Plus, aging.baseCurrency) : "—"}
          tone="red"
          isLoading={agingQuery.isLoading}
        />
        <StatCard
          label="Invoices in this view"
          value={invoicesQuery.data?.total ?? 0}
          tone="blue"
          isLoading={invoicesQuery.isLoading}
        />
      </StatCardGrid>

      <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={invoicesQuery.isLoading}
          minWidth="1000px"
          className="flex-1 min-h-0"
          emptyState={
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              illustrationPreset="documents"
              title="No invoices yet"
              description="Bill your first customer and it will show up here."
              action={canManage ? { label: "New invoice", href: "/accounting/invoices/new" } : undefined}
              filtersActive={hasFilters}
              onClearFilters={() => url.setParams({ search: undefined, status: undefined, open: undefined })}
            />
          }
          pagination={{
            mode: "server",
            page: url.page,
            pageSize: url.pageSize,
            total: invoicesQuery.data?.total ?? 0,
            onPageChange: url.setPage,
            onPageSizeChange: url.setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
    </PageWrapper>
  );
}
