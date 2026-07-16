"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Users, UserPlus } from "lucide-react";
import { useHrEmployees, useHrDepartments } from "@/hooks/api/hr";
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
import { TruncatedText } from "@/components/ui/truncated-text";

type ViewMode = "grid" | "list";

function buildEmployeeListColumns(getDept: (emp: Employee) => string | null): DataTableColumn<Employee>[] {
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
            <Avatar className="w-8 shrink-0">
              <AvatarImage src={resolveImageUrl(emp.image)} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
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
        emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : (emp.name ?? ""),
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
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20">
            {dept}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      headerClassName: "w-[200px] hidden lg:table-cell",
      className: "text-xs text-muted-foreground truncate max-w-[180px] hidden lg:table-cell",
      cell: (emp) => emp.email,
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[90px]",
      cell: (emp) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            emp.isActive
              ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", emp.isActive ? "bg-emerald-500" : "bg-slate-400")} />
          {emp.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];
}

const VIEW_OPTIONS = [
  { value: "grid" as const, icon: LayoutGrid, label: "Grid view" },
  { value: "list" as const, icon: List, label: "List view" },
];

export default function EmployeesPage() {
  const { data: rawEmployees, isLoading } = useHrEmployees();
  const { data: departments } = useHrDepartments();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<ViewMode>("grid");

  const debouncedSearch = useDebouncedValue(search, 300);

  const employees = useMemo(
    () =>
      (Array.isArray(rawEmployees)
        ? rawEmployees
        : ((rawEmployees as { data?: Employee[] })?.data ?? [])) as Employee[],
    [rawEmployees],
  );

  const deptList = departments as Department[] | undefined;

  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    deptList?.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [deptList]);

  const filtered = useMemo(() => {
    let result = employees;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.name?.toLowerCase().includes(lower) ||
          e.firstName?.toLowerCase().includes(lower) ||
          e.lastName?.toLowerCase().includes(lower) ||
          e.email.toLowerCase().includes(lower) ||
          e.designation?.toLowerCase().includes(lower) ||
          e.employeeId?.toLowerCase().includes(lower),
      );
    }
    if (filterDept !== "all") {
      result = result.filter((e) => e.departmentId === Number(filterDept));
    }
    if (filterStatus !== "all") {
      result = result.filter((e) =>
        filterStatus === "active" ? e.isActive : !e.isActive,
      );
    }
    return result;
  }, [employees, debouncedSearch, filterDept, filterStatus]);

  const hasFilters =
    search !== "" || filterDept !== "all" || filterStatus !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterDept("all");
    setFilterStatus("all");
  }, []);

  const getDept = (emp: Employee) =>
    emp.departmentId ? (deptMap.get(emp.departmentId) ?? null) : null;

  if (isLoading) {
    return (
      <PageWrapper title="Employee Directory" subtitle="All team members">
        <EmployeesGridSkeleton />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee Directory"
      subtitle="Browse and manage all team members"
      actions={
        <div className="flex items-center gap-2">
          <ViewToggle<ViewMode>
            value={view}
            onChange={setView}
            options={VIEW_OPTIONS}
            size="sm"
          />
          <Button size="sm" asChild>
            <Link href="/hr/onboarding">
              <UserPlus className="h-4 w-4" />
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
          onDeptChange={setFilterDept}
          onStatusChange={setFilterStatus}
          onClear={clearFilters}
        />
      }
    >
      {filtered.length === 0 ? (
        <EmptyState
          illustration={
            <Users className="h-12 w-12 text-muted-foreground/40" />
          }
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
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              department={getDept(emp)}
            />
          ))}
        </div>
      ) : (
        <DataTable<Employee>
          data={filtered}
          columns={buildEmployeeListColumns(getDept)}
          getRowKey={(emp) => emp.id}
          onRowClick={(emp) => router.push(`/hr/employees/${emp.id}`)}
        />
      )}
    </PageWrapper>
  );
}
