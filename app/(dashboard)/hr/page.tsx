"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import { getEmployees, deleteEmployee, toggleDashboardAccess } from "@/server/actions/hr-actions";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounce";

import {
  type Employee,
  type StatusFilter,
  type RoleFilter,
  ROLE_LABELS,
  PAGE_SIZE,
} from "./_components/hr-types";
import { EmployeesLoadingSkeleton } from "./_components/employees-loading-skeleton";
import { HrFilterBar } from "./_components/hr-filter-bar";
import { HrEmployeeTable } from "./_components/hr-employee-table";
import { HrDeleteDialog } from "./_components/hr-delete-dialog";

export default function HRDashboardPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [togglingAccess, setTogglingAccess] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [page, setPage] = useState(1);

  const departments = useMemo(() => {
    const deptSet = new Map<string, string>();
    employees.forEach((e) => {
      if (e.department) deptSet.set(e.department.name, e.department.name);
    });
    return Array.from(deptSet.values()).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.trim().toLowerCase();
      if (term) {
        result = result.filter((e) => {
          const name = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim().toLowerCase();
          const email = e.email.toLowerCase();
          const first = e.firstName?.toLowerCase() ?? "";
          const last = e.lastName?.toLowerCase() ?? "";
          const designation = e.designation?.toLowerCase() ?? "";
          const roleRaw = e.role.toLowerCase();
          const roleLabel = ROLE_LABELS[e.role]?.toLowerCase() ?? "";
          return (
            name.includes(term) ||
            email.includes(term) ||
            first.includes(term) ||
            last.includes(term) ||
            designation.includes(term) ||
            roleRaw.includes(term) ||
            roleLabel.includes(term)
          );
        });
      }
    }

    if (deptFilter !== "All") {
      result = result.filter((e) => e.department?.name === deptFilter);
    }

    if (statusFilter === "Active") {
      result = result.filter((e) => e.isActive !== false);
    } else if (statusFilter === "Inactive") {
      result = result.filter((e) => e.isActive === false);
    }

    if (roleFilter !== "All") {
      result = result.filter((e) => e.role === roleFilter);
    }

    return result;
  }, [employees, debouncedSearchTerm, deptFilter, statusFilter, roleFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, deptFilter, statusFilter, roleFilter]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getEmployees();
        if (!cancelled) setEmployees(data as Employee[]);
      } catch {
        if (!cancelled) toast.error("Failed to load employees");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = useCallback(async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete.id);
      setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
      toast.success("Employee terminated");
    } catch {
      toast.error("Failed to terminate employee");
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  }, [employeeToDelete]);

  const handleToggleDashboardAccess = useCallback(
    async (userId: string, newValue: boolean) => {
      setTogglingAccess((prev) => new Set(prev).add(userId));
      try {
        const result = await toggleDashboardAccess(userId, newValue);
        if (result.error) {
          toast.error(result.error);
        } else {
          setEmployees((prev) =>
            prev.map((e) =>
              e.id === userId ? { ...e, hasDashboardAccess: newValue } : e,
            ),
          );
          toast.success(`Dashboard access ${newValue ? "enabled" : "disabled"}`);
        }
      } catch {
        toast.error("Failed to toggle dashboard access");
      } finally {
        setTogglingAccess((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [],
  );

  const handleExport = useCallback(async () => {
    const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
    const rows = filteredEmployees.map((e) => ({
      name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email,
      email: e.email,
      role: e.designation ?? ROLE_LABELS[e.role] ?? e.role,
      department: e.department?.name ?? "",
      status: e.isActive !== false ? "Active" : "Inactive",
    }));
    await downloadXlsx(
      `employees-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        {
          name: "Employees",
          columns: [
            { header: "Name", key: "name", width: 25 },
            { header: "Email", key: "email", width: 30 },
            { header: "Role", key: "role", width: 20 },
            { header: "Department", key: "department", width: 20 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows,
        },
      ],
    );
    toast.success("Employees exported");
  }, [filteredEmployees]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setDeptFilter("All");
    setStatusFilter("Active");
    setRoleFilter("All");
  }, []);

  const handleRequestDelete = useCallback((employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  }, []);

  if (loading) {
    return <EmployeesLoadingSkeleton />;
  }

  const showFrom = filteredEmployees.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const showTo = Math.min(page * PAGE_SIZE, filteredEmployees.length);
  const hasActiveFilters =
    !!searchTerm ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  return (
    <PageWrapper
      title="Employees"
      subtitle="Manage your company directory and employee access"
      badge={String(filteredEmployees.length)}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href="/hr/onboarding">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Employee
            </Link>
          </Button>
        </div>
      }
      filters={
        <HrFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          deptFilter={deptFilter}
          onDeptChange={setDeptFilter}
          departments={departments}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          roleFilter={roleFilter}
          onRoleChange={setRoleFilter}
          onClearFilters={handleClearFilters}
        />
      }
    >
      {paginatedEmployees.length > 0 ? (
        <HrEmployeeTable
          employees={paginatedEmployees}
          totalCount={filteredEmployees.length}
          page={page}
          totalPages={totalPages}
          showFrom={showFrom}
          showTo={showTo}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          togglingAccess={togglingAccess}
          onPageChange={setPage}
          onToggleDashboardAccess={handleToggleDashboardAccess}
          onRequestDelete={handleRequestDelete}
        />
      ) : hasActiveFilters ? (
        <EmptyState
          illustration={<EmptySearchIllustration className="mb-3" />}
          title="No results found"
          description="No employees match your current filters. Try adjusting your search."
        />
      ) : (
        <EmptyState
          illustration={<EmptyTeamIllustration className="mb-3" />}
          title="No employees found"
          description="Get started by adding your first team member."
          action={{
            label: "Add Employee",
            href: "/hr/onboarding",
          }}
        />
      )}

      <HrDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        employee={employeeToDelete}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
