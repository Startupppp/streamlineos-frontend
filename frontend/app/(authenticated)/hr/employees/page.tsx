"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { LayoutGrid, List, Users, UserPlus } from "lucide-react";
import { useHrEmployees, useHrDepartments } from "@/hooks/api/hr";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeCard } from "@/features/hr/employees/employee-card";
import { EmployeeRow } from "@/features/hr/employees/employee-row";
import {
  EmployeesFilters,
  type Department,
} from "@/features/hr/employees/employees-filters";
import { EmployeesGridSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import type { Employee } from "@/types/hr";

type ViewMode = "grid" | "list";

const VIEW_OPTIONS = [
  { value: "grid" as const, icon: LayoutGrid, label: "Grid view" },
  { value: "list" as const, icon: List, label: "List view" },
];

export default function EmployeesPage() {
  const { data: rawEmployees, isLoading } = useHrEmployees();
  const { data: departments } = useHrDepartments();

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
      subtitle={`${filtered.length} of ${employees.length} employee${
        employees.length !== 1 ? "s" : ""
      }`}
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
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <caption className="sr-only">Employee directory</caption>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead
                  scope="col"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Employee
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-[110px] text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell"
                >
                  Employee ID
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell"
                >
                  Designation
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell"
                >
                  Department
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell"
                >
                  Email
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-[90px] text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp) => (
                <EmployeeRow
                  key={emp.id}
                  employee={emp}
                  department={getDept(emp)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
