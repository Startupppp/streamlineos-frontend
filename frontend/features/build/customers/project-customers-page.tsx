"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { useProjectCustomers } from "@/hooks/api/build/customers";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useCustomerDisplayPrefs } from "./use-customer-display-prefs";
import { CustomerDisplayPrefsPopover } from "./customer-display-prefs-popover";
import {
  CustomerFilterPopover,
  SIZE_OPTIONS,
  type CustomerFilters,
} from "./customer-filter-popover";
import { CustomerTable } from "./customer-table";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";

const PAGE_SIZE = 20;

const CUSTOMER_TABLE_HEADERS = [
  "Name",
  "Requests",
  "Annual revenue",
  "Size",
  "Owner",
  "Status",
  "Tier",
  "Domain",
  "Data source",
  "Actions",
] as const;

export function ProjectCustomersPage() {
  const { prefs, toggle } = useCustomerDisplayPrefs();

  const listFilters = useBuildListFilters({
    filters: [
      { param: "industry" },
      { param: "size", options: SIZE_OPTIONS },
    ],
  });

  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const industryValue = listFilters.value("industry");
  const sizeValue = listFilters.value("size");

  const currentFilters: CustomerFilters = {
    industry: industryValue !== "all" && industryValue !== "" ? industryValue : undefined,
    size: SIZE_OPTIONS.find((s) => s === sizeValue),
  };

  const { data, isLoading, isError, error, refetch } = useProjectCustomers({
    search: listFilters.debouncedSearch.trim() || undefined,
    industry: currentFilters.industry,
    cursor,
    limit: PAGE_SIZE,
  });

  const pageState = usePageState({
    permission: "build:customers:view",
    isLoading,
    isError,
    error,
    isEmpty: (data?.data ?? []).length === 0,
  });

  const handleFiltersChange = useCallback(
    (next: CustomerFilters) => {
      listFilters.setValue("industry", next.industry ?? "");
      listFilters.setValue("size", next.size ?? "");
    },
    [listFilters],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const customers = data?.data ?? [];
  const filteredCustomers = currentFilters.size
    ? customers.filter((c) => c.size === currentFilters.size)
    : customers;

  const hasNext = Boolean(data?.pagination.hasMore);

  return (
    <PageWrapper
      title="Customers"
      subtitle="CRM companies linked to this workspace"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search customers…",
            label: "Search customers",
          }}
          filters={[
            {
              id: "filters",
              label: "Filters",
              control: (
                <CustomerFilterPopover
                  filters={currentFilters}
                  onFiltersChange={handleFiltersChange}
                />
              ),
              active:
                Boolean(currentFilters.industry) || Boolean(currentFilters.size),
            },
          ]}
          trailing={
            <CustomerDisplayPrefsPopover prefs={prefs} onToggle={toggle} />
          }
          onClearAll={listFilters.clearAll}
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton
                rows={12}
                headers={CUSTOMER_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="companies"
                title="No customers found"
                description={
                  listFilters.isFiltered
                    ? undefined
                    : "Companies from your CRM will appear here."
                }
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <CustomerTable
              prefs={prefs}
              hasPrev={hasPrevious}
              hasNext={hasNext}
              pageSize={PAGE_SIZE}
              onPrevPage={goPrevious}
              onNextPage={handleNextPage}
              customers={filteredCustomers}
            />
          </PageState>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
