"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List, UserPlus } from "lucide-react";
import {
  useInfiniteHrEmployees,
  useHrDepartments,
} from "@/hooks/api/hr";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeCard } from "@/features/hr/employees/employee-card";
import { EmployeesDirectoryStats } from "@/features/hr/employees/employees-directory-stats";
import { EmployeeExportAction } from "@/features/hr/employees/employee-export-action";
import {
  EmployeesFilters,
  type Department,
} from "@/features/hr/employees/employees-filters";
import {
  parseEmployeeListFilters,
  toHrEmployeesApiParams,
  hasActiveEmployeeFilters,
  applyEmployeeUrlUpdates,
  employeeFiltersToUrlUpdates,
  DEFAULT_PAGE_SIZE,
  type EmployeeStatusFilter,
} from "@/features/hr/employees/employee-list-filters";
import { EmployeesGridSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { resolveImageUrl, cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/types/hr";
import { HrPanel, HrStatusBadge } from "@/features/hr/shared/hr-ui";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";

const VIEW_MODES = ["grid", "list"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * `useInfiniteHrEmployees` accumulates its pages, so the grid would mount one
 * card per employee ever loaded. The list branch is bounded by `DataTable`'s own
 * window; this bounds the grid to match, and "Load more employees" reveals the
 * cards already in hand before asking the server for another page — one control,
 * so nothing loaded is ever stranded behind a second one.
 */
const GRID_RENDER_PAGE_SIZE = 24;

function buildEmployeeListColumns(
  getDept: (emp: EmployeeListItem) => string | null,
): DataTableColumn<EmployeeListItem>[] {
  return [
    {
      key: "employee",
      header: "Employee",
      cell: (emp) => {
        const displayName =
          emp.firstName && emp.lastName
            ? `${emp.firstName} ${emp.lastName}`
            : (emp.name ?? "—");
        return (
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
              <AvatarFallback className="bg-status-info-surface text-status-info-ink text-xs font-bold">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <TruncatedText text={displayName} className="text-sm font-semibold text-foreground" />
              {emp.email && <TruncatedText text={emp.email} className="text-dense text-muted-foreground" />}
            </div>
          </div>
        );
      },
    },
    {
      key: "employeeId",
      header: "Employee ID",
      headerClassName: "w-[110px] hidden md:table-cell",
      className: "text-xs text-muted-foreground font-mono hidden md:table-cell",
      cell: (emp) => emp.employeeId ?? "—",
    },
    {
      key: "designation",
      header: "Designation",
      headerClassName: "w-[160px] hidden md:table-cell",
      className: "text-xs text-muted-foreground hidden md:table-cell",
      cell: (emp) => emp.designation ?? "—",
    },
    {
      key: "department",
      header: "Department",
      headerClassName: "w-[140px] hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (emp) => {
        const dept = getDept(emp);
        return dept ? (
          <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-info-surface text-status-info-ink border-status-info-rule">
            {dept}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[100px]",
      cell: (emp) => (
        <HrStatusBadge status={emp.isActive ? "active" : "inactive"} />
      ),
    },
  ];
}

const VIEW_OPTIONS = [
  { value: "grid" as const, icon: LayoutGrid, label: "Grid view" },
  { value: "list" as const, icon: List, label: "List view" },
];

export function EmployeesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const canOnboard = useCan("hr:onboarding:manage");
  const canExport = useCan("hr:export:manage");

  const filters = useMemo(
    () =>
      parseEmployeeListFilters(searchParams, {
        size: PAGE_SIZE,
        status: "all",
      }),
    [searchParams],
  );

  const [searchDraft, setSearchDraft] = useState({
    sourceQuery: filters.q,
    value: filters.q,
  });
  const search =
    searchDraft.sourceQuery === filters.q ? searchDraft.value : filters.q;
  const updateSearch = useCallback(
    (value: string) => setSearchDraft({ sourceQuery: filters.q, value }),
    [filters.q],
  );
  const [view, setView] = useState<ViewMode>(
    () => VIEW_MODES.find((candidate) => candidate === searchParams.get("view")) ?? "grid",
  );

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: departments } = useHrDepartments();
  const deptList = departments as Department[] | undefined;

  const apiParams = useMemo(
    () =>
      toHrEmployeesApiParams({
        ...filters,
        q: debouncedSearch,
      }),
    [filters, debouncedSearch],
  );

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

  const employees = useMemo(
    () => employeePages?.pages.flatMap((page) => page.data) ?? [],
    [employeePages],
  );

  const pageState = usePageState({
    permission: "hr:employees:view",
    isLoading,
    isError,
    error,
    isEmpty: employees.length === 0,
  });

  function handleRetryEmployees() {
    void refetch();
  }

  const [gridPagesShown, setGridPagesShown] = useState(1);
  const gridVisibleCount = Math.min(
    employees.length,
    gridPagesShown * GRID_RENDER_PAGE_SIZE,
  );
  const hasUnrenderedEmployees = view === "grid" && gridVisibleCount < employees.length;
  const gridEmployees = useMemo(
    () => (view === "grid" ? employees.slice(0, gridVisibleCount) : employees),
    [view, employees, gridVisibleCount],
  );

  const handleLoadMore = useCallback(() => {
    if (hasUnrenderedEmployees) {
      setGridPagesShown((p) => p + 1);
      return;
    }
    void fetchNextPage();
  }, [hasUnrenderedEmployees, fetchNextPage]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = applyEmployeeUrlUpdates(searchParams, updates);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const statusHref = useCallback(
    (status: Exclude<EmployeeStatusFilter, "all">) => {
      const params = applyEmployeeUrlUpdates(
        searchParams,
        employeeFiltersToUrlUpdates({ status }, { size: PAGE_SIZE, status: "all" }),
      );
      return `${pathname}?${params.toString()}`;
    },
    [searchParams, pathname],
  );

  const handleDepartmentFilterChange = useCallback(
    (departmentId: string | undefined) => {
      updateParams(
        employeeFiltersToUrlUpdates(
          { departmentId },
          { size: PAGE_SIZE, status: "all" },
        ),
      );
    },
    [updateParams],
  );

  const handleStatusFilterChange = useCallback(
    (status: EmployeeStatusFilter) => {
      updateParams(
        employeeFiltersToUrlUpdates(
          { status },
          { size: PAGE_SIZE, status: "all" },
        ),
      );
    },
    [updateParams],
  );

  useEffect(() => {
    const current = searchParams.get("q") || "";
    if (debouncedSearch === current) return;
    updateParams(
      employeeFiltersToUrlUpdates(
        { q: debouncedSearch },
        { size: PAGE_SIZE, status: "all" },
      ),
    );
  }, [debouncedSearch, searchParams, updateParams]);

  const hasFilters = hasActiveEmployeeFilters(filters, { status: "all" });

  const clearFilters = useCallback(() => {
    updateSearch("");
    updateParams({
      q: null,
      dept: null,
      status: null,
      role: null,
      page: null,
    });
  }, [updateParams, updateSearch]);

  const getDept = (emp: EmployeeListItem) => emp.department?.name ?? null;

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
          <ViewToggle<ViewMode>
            value={view}
            onChange={(v) => {
              setView(v);
              updateParams({ view: v === "grid" ? null : v });
            }}
            options={VIEW_OPTIONS}
            size="sm"
          />
          {canExport && (
            <EmployeeExportAction
              filters={{
                search: apiParams.search,
                departmentId: apiParams.departmentId,
                isActive: apiParams.isActive,
                role: apiParams.role,
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
      filtersClassName="max-md:flex-col max-md:items-stretch max-md:gap-2 max-md:overflow-x-visible max-md:[&>[data-slot=search-input]]:min-w-0 max-md:[&>[data-slot=search-input]]:basis-auto max-md:[&>[data-slot=search-input]]:w-full max-md:[&>*:not([data-slot=search-input])]:w-full"
      filters={
        <EmployeesFilters
          search={search}
          departmentId={filters.departmentId}
          status={filters.status}
          departments={deptList}
          hasFilters={hasFilters}
          onSearchChange={updateSearch}
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
              hasMore={Boolean(hasNextPage)}
              statusFilter={filters.status}
              filters={{
                search: apiParams.search,
                departmentId: apiParams.departmentId,
                role: apiParams.role,
              }}
              statusHref={statusHref}
            />
          </div>

          <div className="md:min-h-0 md:flex-1 md:overflow-y-auto md:scrollbar-hide">
            {employees.length === 0 ? (
              <EmptyState
                illustrationPreset="team"
                title="No employees yet"
                description={
                  hasFilters
                    ? "No results match your filters."
                    : "No workers with active employment records. Onboard your first employee to get started."
                }
                filtersActive={hasFilters}
                onClearFilters={clearFilters}
                action={!hasFilters && canOnboard ? { label: "Add employee", href: "/hr/onboarding" } : undefined}
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : view === "grid" ? (
              <div
                className={cn(
                  "grid auto-rows-max content-start gap-2.5 sm:gap-3",
                  "grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
                  isFetching && "opacity-70 transition-opacity",
                )}
              >
                {gridEmployees.map((emp) => (
                  <EmployeeCard key={emp.id} employee={emp} department={getDept(emp)} />
                ))}
              </div>
            ) : (
              <HrPanel
                padded={false}
                className="flex min-h-0 flex-col overflow-hidden md:h-full md:flex-1"
              >
                <DataTable<EmployeeListItem>
                  data={employees}
                  columns={buildEmployeeListColumns(getDept)}
                  getRowKey={(emp) => emp.id}
                  onRowClick={(emp) => router.push(`/hr/employees/${emp.id}`)}
                  className="min-h-0 flex-1"
                />
              </HrPanel>
            )}
          </div>
        </div>

        {!isError && (
          <InfiniteScrollSentinel
            hasNextPage={hasNextPage || hasUnrenderedEmployees}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            label="Load more employees"
          />
        )}
      </div>
    </PageWrapper>
  );
}
