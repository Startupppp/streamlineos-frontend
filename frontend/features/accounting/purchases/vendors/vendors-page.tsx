"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import {
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccountingBook } from "@/hooks/api/accounting/ledger";
import { useVendor, useVendors } from "@/hooks/api/accounting/ap";
import type { VendorSummary } from "@/types/accounting/accounting-ap";
import { useUrlListState } from "../lib/use-url-list-state";
import { VendorFormSheet } from "./vendor-form-sheet";

const PAGE_SIZE = 20;

export function VendorsPage() {
  const canCreate = useCan("accounting:create");
  const canUpdate = useCan("accounting:update");

  const { getParam, setParams, page, setPage } = useUrlListState();
  const search = getParam("q");
  const activity = getParam("activity");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [isCreating, setIsCreating] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const bookQuery = useAccountingBook();
  const vendorsQuery = useVendors({
    search: debouncedSearch || undefined,
    includeInactive: activity === "all" ? true : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const editingVendorQuery = useVendor(editingVendorId ?? "", {
    enabled: !!editingVendorId,
  });

  const pageState = usePageState({
    permission: "accounting:read",
    isLoading: vendorsQuery.isLoading,
    isError: vendorsQuery.isError,
    error: vendorsQuery.error,
  });
  const handleRetry = useCallback(() => {
    void vendorsQuery.refetch();
  }, [vendorsQuery]);

  function handleSearchChange(value: string): void {
    setParams({ q: value || undefined });
  }

  function handleActivityChange(value: string): void {
    setParams({ activity: value === "active" ? undefined : value });
  }

  function handleCreateOpenChange(open: boolean): void {
    setIsCreating(open);
  }

  function handleEditOpenChange(open: boolean): void {
    if (!open) setEditingVendorId(null);
  }

  const columns: DataTableColumn<VendorSummary>[] = [
    {
      key: "name",
      header: "Vendor",
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/accounting/vendors/${row.id}`}
            className="block truncate text-sm font-medium text-status-info-ink hover:underline"
          >
            {row.displayName}
          </Link>
          {row.legalName && row.legalName !== row.displayName ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.legalName}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (row) => (
        <span className="truncate text-sm text-muted-foreground">
          {row.email ?? row.phone ?? "—"}
        </span>
      ),
    },
    {
      key: "where",
      header: "Where",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {[row.billingRegion, row.billingCountryCode ?? row.countryCode]
            .filter(Boolean)
            .join(", ")}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Bills in",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => row.defaultCurrency,
    },
    {
      key: "terms",
      header: "Days to pay",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => row.paymentTermsDays,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge
          tone={row.isActive ? "success" : "neutral"}
          label={row.isActive ? "Trading" : "Dormant"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-8",
      cell: (row) =>
        canUpdate ? (
          <button
            type="button"
            className="text-xs text-status-info-ink hover:underline"
            onClick={() => setEditingVendorId(row.id)}
          >
            Edit
          </button>
        ) : null,
    },
  ];

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper title="Vendors">
        <PageState
          resolution={pageState}
          loading={null}
          onRetry={handleRetry}
          className="flex-1"
        >
          {null}
        </PageState>
      </PageWrapper>
    );

  const rows = vendorsQuery.data?.items ?? [];
  const filtersActive = search.length > 0 || activity === "all";

  return (
    <PageWrapper
      title="Vendors"
      subtitle="Everyone you buy from, and how their bills should behave."
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
            onClick={() => setIsCreating(true)}
          >
            Add vendor
          </AnimatedIconButton>
        ) : null
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder="Search vendors…"
            value={search}
            onValueChange={handleSearchChange}
          />
          <Select
            value={activity || "active"}
            onValueChange={handleActivityChange}
          >
            <SelectTrigger className={FILTER_SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="active">Currently trading</SelectItem>
              <SelectItem value="all">Everyone, including dormant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={vendorsQuery.isPending}
        minWidth="900px"
        className="flex-1 min-h-0"
        emptyState={
          filtersActive ? (
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              title="No vendors match your filters"
              description="Clear the search to see everyone you buy from."
              action={{
                label: "Clear filters",
                onClick: () => setParams({ q: undefined, activity: undefined }),
              }}
            />
          ) : (
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              title="No vendors yet"
              description="Add the businesses you buy from so their bills can be entered."
              action={
                canCreate
                  ? { label: "Add vendor", onClick: () => setIsCreating(true) }
                  : undefined
              }
            />
          )
        }
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total: vendorsQuery.data?.total ?? 0,
          onPageChange: setPage,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />

      {canCreate ? (
        <VendorFormSheet
          open={isCreating}
          onOpenChange={handleCreateOpenChange}
          vendor={null}
          defaultCurrency={bookQuery.data?.baseCurrency ?? "INR"}
          defaultCountryCode={bookQuery.data?.countryCode ?? "IN"}
        />
      ) : null}

      {canUpdate && editingVendorQuery.data ? (
        <VendorFormSheet
          open={!!editingVendorId}
          onOpenChange={handleEditOpenChange}
          vendor={editingVendorQuery.data}
          defaultCurrency={bookQuery.data?.baseCurrency ?? "INR"}
          defaultCountryCode={bookQuery.data?.countryCode ?? "IN"}
        />
      ) : null}
    </PageWrapper>
  );
}
