"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List, UserPlus, Download } from "lucide-react";
import {
  useHrEmployees,
  useHrDepartments,
  unwrapEmployees,
} from "@/hooks/api/hr";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeCard } from "@/features/hr/employees/employee-card";
import {
  EmployeesFilters,
  type Department,
} from "@/features/hr/employees/employees-filters";
import {
  parseEmployeeListFilters,
  toHrEmployeesApiParams,
  hasActiveEmployeeFilters,
  employeeFiltersToUrlUpdates,
  DEFAULT_PAGE_SIZE,
} from "@/features/hr/employees/employee-list-filters";
import { EmployeesGridSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { resolveImageUrl, cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";
import {
  HrPageContent,
  HrPanel,
  HrSectionHeader,
  HrStatusBadge,
} from "@/features/hr/shared/hr-ui";
import { toast } from "sonner";
import { TruncatedText } from "@/components/ui/truncated-text";

type ViewMode = "grid" | "list";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function buildEmployeeListColumns(
  getDept: (emp: Employee) => string | null,
): DataTableColumn<Employee>[] {
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
              <AvatarFallback className="bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <TruncatedText text={displayName} className="text-sm font-semibold text-foreground" />
              {emp.email && <TruncatedText text={emp.email} className="text-[11px] text-muted-foreground" />}
            </div>
          </div>
        );
      },
      sortable: true,
      sortValue: (emp) =>
        emp.firstName && emp.lastName
          ? `${emp.firstName} ${emp.lastName}`
          : (emp.name ?? ""),
    },
    {
      key: "employeeId",
      header: "Employee ID",
      headerClassName: "w-[110px] hidden md:table-cell",
      className: "text-xs text-muted-foreground font-mono hidden md:table-cell",
      cell: (emp) => emp.employeeId ?? "—",
      sortable: true,
      sortValue: (emp) => emp.employeeId ?? "",
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
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-800/40">
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

  const filters = useMemo(
    () =>
      parseEmployeeListFilters(searchParams, {
        size: PAGE_SIZE,
        status: "all",
      }),
    [searchParams],
  );

  const [search, setSearch] = useState(filters.q);
  const [view, setView] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode) || "grid",
  );

  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

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

  const { data: pageData, isLoading, isFetching, isError, refetch } = useHrEmployees(apiParams);

  const employees = useMemo(() => unwrapEmployees(pageData), [pageData]);
  const pagination = pageData?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const page = filters.page;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const current = searchParams.get("q") || "";
    if (debouncedSearch === current) return;
    updateParams(
      employeeFiltersToUrlUpdates(
        { q: debouncedSearch, page: 1 },
        { size: PAGE_SIZE, status: "all" },
      ),
    );
  }, [debouncedSearch, searchParams, updateParams]);

  const hasFilters = hasActiveEmployeeFilters(filters, { status: "all" });

  const clearFilters = useCallback(() => {
    setSearch("");
    updateParams({
      q: null,
      dept: null,
      status: null,
      role: null,
      page: null,
    });
  }, [updateParams]);

  const getDept = (emp: Employee) => emp.department?.name ?? null;

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const {
        fetchAllEmployeesForExport,
        mapEmployeesToExportRows,
        EMPLOYEE_EXPORT_COLUMNS,
      } = await import("@/features/hr/employees/export-employees");
      const rows = mapEmployeesToExportRows(
        await fetchAllEmployeesForExport({
          search: apiParams.search,
          departmentId: apiParams.departmentId,
          isActive: apiParams.isActive,
          role: apiParams.role,
        }),
      );
      await downloadXlsx(`directory-${new Date().toISOString().slice(0, 10)}.xlsx`, [
        {
          name: "Employees",
          columns: [...EMPLOYEE_EXPORT_COLUMNS],
          rows,
        },
      ]);
      toast.success(`Exported ${rows.length} employee${rows.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Export failed");
    }
  }, [apiParams]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Employee Directory"
        subtitle="All team members"
        variant="display"
      >
        <EmployeesGridSkeleton />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee Directory"
      subtitle={
        isFetching && !isLoading
          ? "Updating…"
          : `${total.toLocaleString()} team members`
      }
      variant="display"
      actions={
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
          <ViewToggle<ViewMode>
            value={view}
            onChange={(v) => {
              setView(v);
              updateParams({ view: v === "grid" ? null : v });
            }}
            options={VIEW_OPTIONS}
            size="sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 flex-1 sm:flex-none"
            onClick={() => void handleExport()}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="h-8 gap-1.5 shadow-sm flex-1 sm:flex-none" asChild>
            <Link href="/hr/onboarding">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Employee</span>
            </Link>
          </Button>
        </div>
      }
      filters={
        <EmployeesFilters
          search={search}
          departmentId={filters.departmentId}
          status={filters.status}
          departments={deptList}
          hasFilters={hasFilters}
          onSearchChange={setSearch}
          onDepartmentIdChange={(id) =>
            updateParams(
              employeeFiltersToUrlUpdates(
                { departmentId: id, page: 1 },
                { size: PAGE_SIZE, status: "all" },
              ),
            )
          }
          onStatusChange={(s) =>
            updateParams(
              employeeFiltersToUrlUpdates(
                { status: s, page: 1 },
                { size: PAGE_SIZE, status: "all" },
              ),
            )
          }
          onClear={clearFilters}
        />
      }
    >
      <HrPageContent>
        <HrSectionHeader
          title={view === "grid" ? "People grid" : "People list"}
          description={`Page ${page} of ${totalPages}`}
        />

        {isError ? (
          <HrPanel className="text-center py-10">
            <p className="text-sm font-semibold">Couldn't load directory</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Something went wrong while fetching employees.
            </p>
            <Button size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </HrPanel>
        ) : employees.length === 0 ? (
          <EmptyState
            illustrationPreset="team"
            title="No employees match your filters"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Your employee directory is empty. Add your first team member to get started."
            }
            action={
              hasFilters
                ? { label: "Clear filters", onClick: clearFilters }
                : { label: "Add Employee", href: "/hr/onboarding" }
            }
          />
        ) : view === "grid" ? (
          <div
            className={cn(
              "grid gap-3 sm:gap-4 grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5",
              isFetching && "opacity-70 transition-opacity",
            )}
          >
            {employees.map((emp) => (
              <EmployeeCard key={emp.id} employee={emp} department={getDept(emp)} />
            ))}
          </div>
        ) : (
          <HrPanel padded={false} className="overflow-hidden flex-1 min-h-0 flex flex-col">
            <DataTable<Employee>
              data={employees}
              columns={buildEmployeeListColumns(getDept)}
              getRowKey={(emp) => emp.id}
              onRowClick={(emp) => router.push(`/hr/employees/${emp.id}`)}
              className="flex-1 min-h-0"
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total,
                onPageChange: (p) =>
                  updateParams({ page: p === 1 ? null : String(p) }),
              }}
            />
          </HrPanel>
        )}

        {view === "grid" && employees.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{" "}
              {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 1}
                onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </HrPageContent>
    </PageWrapper>
  );
}
