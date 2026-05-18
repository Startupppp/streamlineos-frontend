"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useHrEmployees, useTerminateEmployee, useToggleDashboardAccess } from "@/lib/api/hooks/hr";

import {
  type Employee,
  type StatusFilter,
  type RoleFilter,
  type PageSizeOption,
  ROLE_LABELS,
  PAGE_SIZE,
} from "@/features/hr/employees/hr-types";
import { EmployeesLoadingSkeleton } from "@/features/hr/employees/employees-loading-skeleton";
import { HrFilterBar } from "@/features/hr/employees/hr-filter-bar";
import { HrEmployeeTable } from "@/features/hr/employees/hr-employee-table";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { HrDashboardOverview } from "@/features/hr/hr-dashboard-overview";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

export default function HRDashboardPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const searchFromUrl = searchParams.get("q") || "";
  const deptFilter = searchParams.get("dept") || "All";
  const statusFilter = (searchParams.get("status") as StatusFilter) || "Active";
  const roleFilter = (searchParams.get("role") as RoleFilter) || "All";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = (Number(searchParams.get("size")) || PAGE_SIZE) as PageSizeOption;

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const debouncedSearchInput = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  useEffect(() => {
    const trimmed = debouncedSearchInput.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH) return;

    const nextQ = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : "";
    if (nextQ === searchFromUrl) return;

    updateParams({ q: nextQ || null, page: null });
  }, [debouncedSearchInput, searchFromUrl, updateParams]);

  const effectiveSearchTerm = useMemo(() => {
    const trimmed = debouncedSearchInput.trim();
    return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : "";
  }, [debouncedSearchInput]);

  const { data: rawEmployees, isLoading } = useHrEmployees();
  const terminateMutation = useTerminateEmployee();
  const toggleAccessMutation = useToggleDashboardAccess();

  const employees = useMemo(() => (Array.isArray(rawEmployees) ? rawEmployees : []) as unknown as Employee[], [rawEmployees]);

  const setSearchTerm = useCallback((q: string) => setSearchInput(q), []);
  const setDeptFilter = useCallback((d: string) => updateParams({ dept: d === "All" ? null : d, page: null }), [updateParams]);
  const setStatusFilter = useCallback((s: StatusFilter) => updateParams({ status: s === "Active" ? null : s, page: null }), [updateParams]);
  const setRoleFilter = useCallback((r: RoleFilter) => updateParams({ role: r === "All" ? null : r, page: null }), [updateParams]);
  const setPage = useCallback((p: number) => updateParams({ page: p === 1 ? null : String(p) }), [updateParams]);

  const departments = useMemo(() => {
    const deptSet = new Map<string, string>();
    employees.forEach((e) => {
      if (e.department) deptSet.set(e.department.name, e.department.name);
    });
    return Array.from(deptSet.values()).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (effectiveSearchTerm) {
      const term = effectiveSearchTerm.toLowerCase();
      if (term) {
        result = result.filter((e) => {
          const name = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim().toLowerCase();
          const email = e.email.toLowerCase();
          const first = e.firstName?.toLowerCase() ?? "";
          const last = e.lastName?.toLowerCase() ?? "";
          const designation = e.designation?.toLowerCase() ?? "";
          const employeeId = e.employeeId?.toLowerCase() ?? "";
          const roleRaw = e.role.toLowerCase();
          const roleLabel = ROLE_LABELS[e.role]?.toLowerCase() ?? "";
          return (
            name.includes(term) || email.includes(term) || first.includes(term) ||
            last.includes(term) || designation.includes(term) || employeeId.includes(term) ||
            roleRaw.includes(term) || roleLabel.includes(term)
          );
        });
      }
    }

    if (deptFilter !== "All") result = result.filter((e) => e.department?.name === deptFilter);

    if (statusFilter === "Active") result = result.filter((e) => e.isActive !== false);
    else if (statusFilter === "Inactive") result = result.filter((e) => e.isActive === false);

    if (roleFilter !== "All") result = result.filter((e) => e.role === roleFilter);

    return result;
  }, [employees, effectiveSearchTerm, deptFilter, statusFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const handlePageSizeChange = useCallback(
    (size: PageSizeOption) => updateParams({ size: size === PAGE_SIZE ? null : String(size), page: null }),
    [updateParams],
  );

  const handleDelete = useCallback(async () => {
    if (!employeeToDelete) return;
    terminateMutation.mutate(employeeToDelete.id, {
      onSuccess: () => {
        toast.success("Employee terminated", {
          action: {
            label: "View terminated",
            onClick: () => router.push("/hr/employees/terminated"),
          },
        });
        setDeleteDialogOpen(false);
        setEmployeeToDelete(null);
      },
      onError: () => toast.error("Failed to terminate employee"),
    });
  }, [employeeToDelete, terminateMutation]);

  const handleToggleDashboardAccess = useCallback(
    (userId: string, newValue: boolean) => {
      toggleAccessMutation.mutate(
        { userId, hasDashboardAccess: newValue },
        {
          onSuccess: () => toast.success(`Dashboard access ${newValue ? "enabled" : "disabled"}`),
          onError: () => toast.error("Failed to toggle dashboard access"),
        },
      );
    },
    [toggleAccessMutation],
  );

  const handleExport = useCallback(async () => {
    const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
    const rows = filteredEmployees.map((e) => ({
      name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email,
      employeeId: e.employeeId ?? "",
      email: e.email,
      role: e.designation ?? ROLE_LABELS[e.role] ?? e.role,
      department: e.department?.name ?? "",
      status: e.isActive !== false ? "Active" : "Inactive",
    }));
    await downloadXlsx(`employees-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: "Employees",
        columns: [
          { header: "Name", key: "name", width: 25 },
          { header: "Employee ID", key: "employeeId", width: 16 },
          { header: "Email", key: "email", width: 30 },
          { header: "Role", key: "role", width: 20 },
          { header: "Department", key: "department", width: 20 },
          { header: "Status", key: "status", width: 12 },
        ],
        rows,
      },
    ]);
    toast.success("Employees exported");
  }, [filteredEmployees]);

  const handleClearFilters = useCallback(
    () => updateParams({ q: null, dept: null, status: null, role: null, page: null }),
    [updateParams],
  );

  const handleRequestDelete = useCallback((employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  }, []);

  if (isLoading) return <EmployeesLoadingSkeleton />;

  const showFrom = filteredEmployees.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const showTo = Math.min(page * pageSize, filteredEmployees.length);
  const hasActiveFilters =
    !!effectiveSearchTerm ||
    !!searchInput.trim() ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";
  const togglingAccess = toggleAccessMutation.isPending
    ? new Set([toggleAccessMutation.variables?.userId].filter(Boolean) as string[])
    : new Set<string>();

  return (
    <PageWrapper
      title="Employees"
      subtitle="Manage your company directory and employee access"
      badge={String(filteredEmployees.length)}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/employees/terminated">Terminated</Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href="/hr/onboarding?tab=wizard">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Employee
            </Link>
          </Button>
        </div>
      }
      filters={
        <HrFilterBar
          searchTerm={searchInput}
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
      <HrDashboardOverview />

      {paginatedEmployees.length > 0 ? (
        <HrEmployeeTable
          employees={paginatedEmployees}
          totalCount={filteredEmployees.length}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          showFrom={showFrom}
          showTo={showTo}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          togglingAccess={togglingAccess}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
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
          action={{ label: "Add Employee", href: "/hr/onboarding?tab=wizard" }}
        />
      )}

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Terminate Employee"
        description={
          employeeToDelete
            ? `Are you sure you want to terminate ${employeeToDelete.firstName ?? ""} ${employeeToDelete.lastName ?? ""}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Terminate"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
