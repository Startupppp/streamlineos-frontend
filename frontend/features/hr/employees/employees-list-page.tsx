"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, UserPlus } from "lucide-react";
import { useInfiniteHrEmployees, useHrDepartments } from "@/hooks/api/hr";
import { useFlushableDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmployeesDirectoryStats } from "@/features/hr/employees/employees-directory-stats";
import { EmployeeExportAction } from "@/features/hr/employees/employee-export-action";
import { EmployeesFilters, type Department } from "@/features/hr/employees/employees-filters";
import {
  toHrEmployeesApiParams,
  hasActiveEmployeeFilters,
  employeeFiltersToUrlUpdates,
  DEFAULT_PAGE_SIZE,
  type EmployeeStatusFilter,
} from "@/features/hr/employees/employee-list-filters";
import { EmployeesGridSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { EmployeesListResults, type EmployeesListView } from "@/features/hr/employees/employees-list-results";
import { EmployeePersonDrawer } from "@/features/hr/employees/employee-person-drawer";
import { employeeSearchScopeKey, useSearchIntegrity } from "@/features/hr/employees/search-integrity";
import { useEmployeeListUrlState } from "@/features/hr/employees/use-employee-list-url-state";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import type { EmployeeListItem } from "@/types/hr";
import { FILTER_ROW_STACKS_ON_MOBILE } from "@/components/ui/content-fill-panel";

const VIEW_MODES: readonly EmployeesListView[] = ["grid", "list"];

const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const GRID_RENDER_PAGE_SIZE = 24;

const VIEW_OPTIONS = [
  { value: "grid" as const, icon: LayoutGrid, label: "Grid view" },
  { value: "list" as const, icon: List, label: "List view" },
];

export function EmployeesListPage() {
  const searchParams = useSearchParams();
  const canOnboard = useCan("hr:onboarding:manage");
  const canExport = useCan("hr:export:manage");

  const urlState = useEmployeeListUrlState(PAGE_SIZE);
  const { filters, search, updateSearch, updateParams, statusHref, clearFilters } = urlState;

  const [view, setView] = useState<EmployeesListView>(
    () => VIEW_MODES.find((candidate) => candidate === searchParams.get("view")) ?? "grid",
  );
  const [debouncedSearch, flushSearch] = useFlushableDebouncedValue(search, 300);
  const { data: departments } = useHrDepartments();
  const deptList = departments as Department[] | undefined;

  const apiParams = useMemo(
    () => toHrEmployeesApiParams({ ...filters, q: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const scopedParams = useMemo(() => ({ ...apiParams, search: undefined }), [apiParams]);

  const {
    data: employeePages,
    error,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteHrEmployees(apiParams);

  const searchedEmployees = useMemo(
    () => employeePages?.pages.flatMap((page) => page.data) ?? [],
    [employeePages],
  );

  const integrityFailed = useSearchIntegrity({
    scopeKey: employeeSearchScopeKey(apiParams),
    isSearching: Boolean(apiParams.search),
    isSettled: !isLoading && !isFetching && !isError,
    rowCount: searchedEmployees.length,
  });

  const scopedFallback = useInfiniteHrEmployees(scopedParams, { enabled: integrityFailed });
  const fallbackEmployees = useMemo(
    () => scopedFallback.data?.pages.flatMap((page) => page.data) ?? [],
    [scopedFallback.data],
  );

  const employees = integrityFailed ? fallbackEmployees : searchedEmployees;
  const activeParams = integrityFailed ? scopedParams : apiParams;
  const activeHasNextPage = integrityFailed
    ? Boolean(scopedFallback.hasNextPage)
    : Boolean(hasNextPage);

  const pageState = usePageState({
    permission: "hr:employees:view",
    isLoading,
    isError,
    error,
    isEmpty: false,
  });

  const [gridPagesShown, setGridPagesShown] = useState(1);
  const gridVisibleCount = Math.min(employees.length, gridPagesShown * GRID_RENDER_PAGE_SIZE);
  const hasUnrenderedEmployees = view === "grid" && gridVisibleCount < employees.length;
  const gridEmployees = useMemo(
    () => (view === "grid" ? employees.slice(0, gridVisibleCount) : employees),
    [view, employees, gridVisibleCount],
  );

  const [drawerEmployee, setDrawerEmployee] = useState<EmployeeListItem | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const handleOpenPerson = useCallback((employee: EmployeeListItem) => {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDrawerEmployee(employee);
  }, []);

  const handleDrawerOpenChange = useCallback((next: boolean) => {
    if (next) return;
    setDrawerEmployee(null);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener) requestAnimationFrame(() => opener.focus());
  }, []);

  function handleRetryEmployees() {
    void refetch();
  }

  const handleLoadMore = useCallback(() => {
    if (hasUnrenderedEmployees) {
      setGridPagesShown((shown) => shown + 1);
      return;
    }
    if (integrityFailed) {
      void scopedFallback.fetchNextPage();
      return;
    }
    void fetchNextPage();
  }, [hasUnrenderedEmployees, integrityFailed, scopedFallback, fetchNextPage]);

  const handleViewChange = useCallback(
    (next: EmployeesListView) => {
      setView(next);
      updateParams({ view: next === "grid" ? null : next });
    },
    [updateParams],
  );

  const handleDepartmentFilterChange = useCallback(
    (departmentId: string | undefined) => {
      updateParams(
        employeeFiltersToUrlUpdates({ departmentId }, { size: PAGE_SIZE, status: "all" }),
      );
    },
    [updateParams],
  );

  const handleStatusFilterChange = useCallback(
    (status: EmployeeStatusFilter) => {
      updateParams(employeeFiltersToUrlUpdates({ status }, { size: PAGE_SIZE, status: "all" }));
    },
    [updateParams],
  );

  useEffect(() => {
    const current = searchParams.get("q") || "";
    if (debouncedSearch === current) return;
    updateParams(
      employeeFiltersToUrlUpdates({ q: debouncedSearch }, { size: PAGE_SIZE, status: "all" }),
    );
  }, [debouncedSearch, searchParams, updateParams]);

  const hasFilters = hasActiveEmployeeFilters(filters, { status: "all" });

  return (
    <PageWrapper
      title="Employee directory"
      subtitle={
        isFetching && !isLoading
          ? "Updating…"
          : "Employment administration for people with HR records — everyone in the organization is in the Directory."
      }
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4"
      state={pageState}
      onRetry={handleRetryEmployees}
      loading={
        <>
          <StatCardGridSkeleton cols={3} count={3} />
          <EmployeesGridSkeleton />
        </>
      }
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ViewToggle<EmployeesListView>
            value={view}
            onChange={handleViewChange}
            options={VIEW_OPTIONS}
            size="sm"
          />
          {canExport && (
            <EmployeeExportAction
              filters={{
                search: activeParams.search,
                departmentId: activeParams.departmentId,
                isActive: activeParams.isActive,
                role: activeParams.role,
              }}
            />
          )}
          {canOnboard && (
            <Button size="sm" className="flex-1 gap-1.5 shadow-sm sm:flex-none" asChild>
              <Link href="/hr/onboarding">
                <UserPlus className="h-3.5 w-3.5" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add employee</span>
              </Link>
            </Button>
          )}
        </div>
      }
      filtersClassName={FILTER_ROW_STACKS_ON_MOBILE}
      filters={
        <EmployeesFilters
          search={search}
          departmentId={filters.departmentId}
          status={filters.status}
          departments={deptList}
          hasFilters={hasFilters}
          onSearchChange={updateSearch}
          onSearchSubmit={flushSearch}
          onDepartmentIdChange={handleDepartmentFilterChange}
          onStatusChange={handleStatusFilterChange}
          onClear={clearFilters}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide md:flex md:flex-col md:gap-3 md:overflow-hidden">
          <div className="mb-3 shrink-0 md:mb-0">
            <EmployeesDirectoryStats
              loadedCount={employees.length}
              hasMore={activeHasNextPage}
              statusFilter={filters.status}
              filters={{
                search: activeParams.search,
                departmentId: activeParams.departmentId,
                role: activeParams.role,
              }}
              statusHref={statusHref}
            />
          </div>

          <div className="md:min-h-0 md:flex-1 md:overflow-y-auto md:scrollbar-hide">
            <EmployeesListResults
              employees={employees}
              gridEmployees={gridEmployees}
              view={view}
              isFetching={isFetching}
              hasFilters={hasFilters}
              canOnboard={canOnboard}
              integrityFailed={integrityFailed}
              onClearFilters={clearFilters}
              onOpenPerson={handleOpenPerson}
            />
          </div>
        </div>

        {!isError && (
          <InfiniteScrollSentinel
            hasNextPage={activeHasNextPage || hasUnrenderedEmployees}
            isFetchingNextPage={isFetchingNextPage || scopedFallback.isFetchingNextPage}
            onLoadMore={handleLoadMore}
            label="Load more employees"
          />
        )}
      </div>

      <EmployeePersonDrawer
        employee={drawerEmployee}
        open={drawerEmployee !== null}
        onOpenChange={handleDrawerOpenChange}
      />
    </PageWrapper>
  );
}
