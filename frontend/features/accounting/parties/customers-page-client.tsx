"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  PARTIES_CREATE,
  PARTIES_READ,
  useParties,
} from "@/hooks/api/accounting/parties";
import type { PartyRole, PartySummary } from "@/types/accounting/accounting-ar";
import { PARTY_ROLE_LABEL } from "../sales/ar-labels";
import { useListUrlState } from "../sales/use-list-url-state";
import { PartyFormSheet } from "./party-form-sheet";

const ROLE_VALUES: ReadonlyArray<PartyRole> = ["customer", "vendor", "both"];

function toRole(value: string): PartyRole | undefined {
  return ROLE_VALUES.find((role) => role === value);
}

const columns: DataTableColumn<PartySummary>[] = [
  {
    key: "displayName",
    header: "Customer",
    cell: (row) => (
      <div className="min-w-0">
        <Link
          href={`/accounting/customers/${row.id}`}
          className="truncate text-sm font-medium text-status-info-ink hover:underline"
        >
          {row.displayName}
        </Link>
        {row.legalName && row.legalName !== row.displayName ? (
          <p className="truncate text-dense text-muted-foreground">
            {row.legalName}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "email",
    header: "Contact",
    cell: (row) => (
      <div className="min-w-0">
        <p className="truncate text-sm">{row.email ?? "No email"}</p>
        {row.phone ? (
          <p className="truncate font-mono text-dense text-muted-foreground">
            {row.phone}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: "role",
    header: "Relationship",
    cell: (row) => (
      <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
        {PARTY_ROLE_LABEL[row.role]}
      </Badge>
    ),
  },
  {
    key: "defaultCurrency",
    header: "Bills in",
    cell: (row) => (
      <span className="font-mono text-dense">{row.defaultCurrency}</span>
    ),
  },
  {
    key: "paymentTermsDays",
    header: "Pays within",
    className: "text-right",
    cell: (row) => (
      <span className="font-mono text-dense tabular-nums">
        {row.paymentTermsDays} days
      </span>
    ),
  },
  {
    key: "isActive",
    header: "Status",
    cell: (row) => (
      <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
        {row.isActive ? "Active" : "Hidden"}
      </Badge>
    ),
  },
];

export function CustomersPageClient() {
  const canCreate = useCan(PARTIES_CREATE);
  const url = useListUrlState();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState(url.get("search"));
  const debouncedSearch = useDebouncedValue(search, 300);

  const roleParam = url.get("role");
  const role = toRole(roleParam);
  const includeInactive = url.get("include") === "all";

  const partiesQuery = useParties({
    role: roleParam === "any" ? undefined : (role ?? "customer"),
    search: debouncedSearch || undefined,
    includeInactive,
    page: url.page,
    pageSize: url.pageSize,
  });

  function handleSearchChange(value: string): void {
    setSearch(value);
    url.setParams({ search: value || undefined });
  }

  function handleRoleChange(value: string): void {
    url.setParams({ role: value === "customer" ? undefined : value });
  }

  function handleIncludeChange(value: string): void {
    url.setParams({ include: value === "active" ? undefined : value });
  }

  const pageState = usePageState({
    permission: PARTIES_READ,
    isLoading: partiesQuery.isLoading,
    isError: partiesQuery.isError,
    error: partiesQuery.error,
  });
  const handleRetry = useCallback(() => {
    void partiesQuery.refetch();
  }, [partiesQuery]);

  const rows = partiesQuery.data?.items ?? [];
  const hasFilters =
    debouncedSearch.length > 0 || roleParam.length > 0 || includeInactive;

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search by name or email…"
        value={search}
        onValueChange={handleSearchChange}
        className="min-w-0 flex-1 lg:max-w-md"
      />
      <Select value={roleParam || "customer"} onValueChange={handleRoleChange}>
        <SelectTrigger
          className={FILTER_SELECT_TRIGGER}
          aria-label="Relationship"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="customer">Customers</SelectItem>
          <SelectItem value="vendor">Suppliers</SelectItem>
          <SelectItem value="both">Both</SelectItem>
          <SelectItem value="any">Everyone</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={includeInactive ? "all" : "active"}
        onValueChange={handleIncludeChange}
      >
        <SelectTrigger
          className={FILTER_SELECT_TRIGGER}
          aria-label="Visibility"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="active">Active only</SelectItem>
          <SelectItem value="all">Include hidden</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper title="Customers">
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

  return (
    <PageWrapper
      title="Customers"
      subtitle="Everyone you bill, and the terms you bill them on."
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
            onClick={() => setCreateOpen(true)}
          >
            Add customer
          </AnimatedIconButton>
        ) : null
      }
      filters={filters}
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={partiesQuery.isLoading}
        minWidth="900px"
        className="flex-1 min-h-0"
        emptyState={
          <EmptyState
            className="border-0 bg-transparent min-h-[40vh]"
            illustrationPreset="clients"
            title="No customers yet"
            description="Add the first company you bill and their invoices will follow."
            action={
              canCreate
                ? { label: "Add customer", onClick: () => setCreateOpen(true) }
                : undefined
            }
            filtersActive={hasFilters}
            onClearFilters={() =>
              url.setParams({
                search: undefined,
                role: undefined,
                include: undefined,
              })
            }
          />
        }
        pagination={{
          mode: "server",
          page: url.page,
          pageSize: url.pageSize,
          total: partiesQuery.data?.total ?? 0,
          onPageChange: url.setPage,
          onPageSizeChange: url.setPageSize,
          pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
        }}
      />

      <PartyFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
