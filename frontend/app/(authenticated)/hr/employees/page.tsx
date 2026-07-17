"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List, Users, UserPlus, Download } from "lucide-react";
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

const PAGE_SIZE = 20;

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

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = Number(searchParams.get("page")) || 1;
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [filterDept, setFilterDept] = useState(searchParams.get("dept") || "all");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "all");
  const [view, setView] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode) || "grid",
  );

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: departments } = useHrDepartments();
  const deptList = departments as Department[] | undefined;

  const departmentId =
    filterDept !== "all" ? Number(filterDept) || undefined : undefined;
  const isActiveParam =
    filterStatus === "active"
      ? "true"
      : filterStatus === "inactive"
        ? "false"
        : "all";

  const { data: pageData, isLoading, isFetching, isError, refetch } = useHrEmployees({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    departmentId,
    isActive: isActiveParam,
  });

  const employees = useMemo(() => unwrapEmployees(pageData), [pageData]);
  const pagination = pageData?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

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

  // Sync debounced search to URL
  useEffect(() => {
    const current = searchParams.get("q") || "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    deptList?.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [deptList]);

  const hasFilters =
    search !== "" || filterDept !== "all" || filterStatus !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterDept("all");
    setFilterStatus("all");
    updateParams({ q: null, dept: null, status: null, page: null });
  }, [updateParams]);

  const getDept = (emp: Employee) =>
    emp.department?.name ??
    (emp.departmentId ? (deptMap.get(emp.departmentId) ?? null) : null);

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      await downloadXlsx(`directory-${new Date().toISOString().slice(0, 10)}.xlsx`, [
        {
          name: "Employees",
          columns: [
            { header: "Name", key: "name", width: 24 },
            { header: "Email", key: "email", width: 28 },
            { header: "Designation", key: "designation", width: 20 },
            { header: "Department", key: "department", width: 18 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: employees.map((e) => ({
            name:
              e.firstName && e.lastName
                ? `${e.firstName} ${e.lastName}`
                : (e.name ?? e.email),
            email: e.email,
            designation: e.designation ?? "",
            department: getDept(e) ?? "",
            status: e.isActive ? "Active" : "Inactive",
          })),
        },
      ]);
      toast.success("Directory exported");
    } catch {
      toast.error("Export failed");
    }
  }, [employees, deptMap]);

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
        <div className="flex items-center gap-2">
          <ViewToggle<ViewMode>
            value={view}
            onChange={(v) => {
              setView(v);
              updateParams({ view: v === "grid" ? null : v });
            }}
            options={VIEW_OPTIONS}
            size="sm"
          />
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void handleExport()}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="h-8 gap-1.5 shadow-sm" asChild>
            <Link href="/hr/onboarding">
              <UserPlus className="h-3.5 w-3.5" />
              Add Employee
            </Link>
          </Button>
        </div>
      }
      filters={
        <EmployeesFilters
          search={search}
          filterDept={filterDept}
          filterStatus={filterStatus}
          departments={deptList}
          hasFilters={hasFilters}
          onSearchChange={setSearch}
          onDeptChange={(d) => {
            setFilterDept(d);
            updateParams({ dept: d === "all" ? null : d, page: null });
          }}
          onStatusChange={(s) => {
            setFilterStatus(s);
            updateParams({ status: s === "all" ? null : s, page: null });
          }}
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
            <p className="text-sm font-semibold">Couldn’t load directory</p>
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
              "grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5",
              isFetching && "opacity-70 transition-opacity",
            )}
          >
            {employees.map((emp) => (
              <EmployeeCard key={emp.id} employee={emp} department={getDept(emp)} />
            ))}
          </div>
        ) : (
          <HrPanel padded={false} className="overflow-hidden">
            <DataTable<Employee>
              data={employees}
              columns={buildEmployeeListColumns(getDept)}
              getRowKey={(emp) => emp.id}
              onRowClick={(emp) => router.push(`/hr/employees/${emp.id}`)}
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

        {/* Grid pagination footer */}
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
