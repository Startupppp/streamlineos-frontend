"use client";

import { useCallback, useTransition, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useProjectCustomers } from "@/hooks/api/build/customers";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useMotionVariants } from "@/lib/motion-variants";
import { EmptyCompaniesIllustration } from "@/components/illustrations";
import { useCustomerDisplayPrefs } from "./use-customer-display-prefs";
import { CustomerDisplayPrefsPopover } from "./customer-display-prefs-popover";
import {
  CustomerFilterPopover,
  ActiveCustomerFilterChips,
  type CustomerFilters,
} from "./customer-filter-popover";
import { CustomerTable } from "./customer-table";

const PAGE_SIZE = 20;

export function ProjectCustomersPage() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const [filters, setFilters] = useState<CustomerFilters>({
    industry: searchParams.get("industry") ?? undefined,
    size: (searchParams.get("size") as CustomerFilters["size"]) ?? undefined,
  });

  const debouncedSearch = useDebouncedValue(search, 300);
  const { prefs, toggle } = useCustomerDisplayPrefs();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null });
    setCursor(undefined);
    setCursorStack([]);
  }, [debouncedSearch, searchParams, updateParams]);

  const canView = useCan("build:customers:view");

  const { data, isLoading, isError, refetch } = useProjectCustomers({
    search: debouncedSearch.trim() || undefined,
    industry: filters.industry,
    cursor,
    limit: PAGE_SIZE,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleFiltersChange = useCallback(
    (next: CustomerFilters) => {
      setFilters(next);
      updateParams({
        industry: next.industry ?? null,
        size: next.size ?? null,
      });
      setCursor(undefined);
      setCursorStack([]);
    },
    [updateParams],
  );

  const handleFilterRemove = useCallback(
    (key: keyof CustomerFilters) => {
      handleFiltersChange({ ...filters, [key]: undefined });
    },
    [filters, handleFiltersChange],
  );

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  }, [data?.pagination.nextCursor, cursor]);

  const handlePrevPage = useCallback(() => {
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((prev) => prev.slice(0, -1));
    setCursor(prevCursor === "" ? undefined : prevCursor);
  }, [cursorStack]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const customersFiltersActive = !!(debouncedSearch || filters.industry || filters.size);

  const handleClearCustomerFilters = useCallback(() => {
    setSearch("");
    setFilters({});
    updateParams({ q: null, industry: null, size: null });
    setCursor(undefined);
    setCursorStack([]);
  }, [updateParams]);

  const customers = data?.data ?? [];
  const filteredCustomers = filters.size
    ? customers.filter((c) => c.size === filters.size)
    : customers;

  const hasPrev = cursorStack.length > 0;
  const hasNext = !!data?.pagination.hasMore;

  if (!canView) {
    return (
      <PageWrapper
        title="Customers"
        subtitle="CRM companies linked to this workspace"
        noInternalScroll
      >
        <EmptyState
          illustration={
            <EmptyCompaniesIllustration className="h-full w-full" />
          }
          title="Access restricted"
          description="You don't have permission to view customers."
          className="border-0 bg-transparent min-h-[40dvh]"
        />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper
        title="Customers"
        subtitle="CRM companies linked to this workspace"
        noInternalScroll
      >
        <DataTableSkeleton rows={12} columns={5} className="flex-1" />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Customers"
        subtitle="CRM companies linked to this workspace"
        noInternalScroll
      >
        <ErrorState
          title="Failed to load customers"
          description="An error occurred while loading your customers."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Customers"
      subtitle="CRM companies linked to this workspace"
      noInternalScroll
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder="Search customers..."
            value={search}
            onValueChange={handleSearchChange}
          />
          <CustomerFilterPopover
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
          <ActiveCustomerFilterChips
            filters={filters}
            onRemove={handleFilterRemove}
          />
          <div className="ml-auto shrink-0">
            <CustomerDisplayPrefsPopover prefs={prefs} onToggle={toggle} />
          </div>
        </div>
      }
    >
      <motion.div
        className="flex min-h-0 flex-1 flex-col gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="flex min-h-0 flex-1 flex-col">
          <CustomerTable
            customers={filteredCustomers}
            prefs={prefs}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            emptyState={
              <EmptyState
                illustration={
                  <EmptyCompaniesIllustration className="h-full w-full" />
                }
                title="No customers found"
                description={customersFiltersActive ? undefined : "Companies from your CRM will appear here."}
                filtersActive={customersFiltersActive}
                onClearFilters={handleClearCustomerFilters}
                className="border-0 bg-transparent min-h-[40dvh]"
              />
            }
          />
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
