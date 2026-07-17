"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import {
  EmptySearchIllustration,
  EmptyTeamIllustration,
} from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useHrDepartments, useHrEmployees, useTerminateEmployee } from "@/hooks/api/hr";

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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HrDashboardOverview } from "@/features/hr/hr-dashboard-overview";

export default function HRDashboardPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null,
  );

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

  const [searchTerm, setSearchTermLocal] = useState(searchParams.get("q") || "");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const debouncedSearchRef = useRef(debouncedSearchTerm);
  useEffect(() => {
    if (debouncedSearchRef.current === debouncedSearchTerm) return;
    debouncedSearchRef.current = debouncedSearchTerm;
    updateParams({ q: debouncedSearchTerm || null, page: null });
  }, [debouncedSearchTerm, updateParams]);

  const deptFilter = searchParams.get("dept") || "All";
  const statusFilter = (searchParams.get("status") as StatusFilter) || "Active";
  const roleFilter = (searchParams.get("role") as RoleFilter) || "All";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = (Number(searchParams.get("size")) || PAGE_SIZE) as PageSizeOption;

  const serverSearch = searchParams.get("q") || undefined;

  const { data: departmentsData } = useHrDepartments();
  const departmentNames = useMemo(
    () => (departmentsData ?? []).map((d) => d.name).sort(),
    [departmentsData],
  );

  const { data: paginatedResult, isLoading } = useHrEmployees({
    page,
    limit: pageSize,
    search: serverSearch,
    dept: deptFilter !== "All" ? deptFilter : undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
    role: roleFilter !== "All" ? roleFilter : undefined,
  });

  const terminateMutation = useTerminateEmployee();

  const employees = useMemo<Employee[]>(
    () => (Array.isArray(paginatedResult?.data) ? (paginatedResult.data as Employee[]) : []),
    [paginatedResult],
  );
  const totalCount = paginatedResult?.pagination?.total ?? 0;
  const totalPages = paginatedResult?.pagination?.totalPages ?? 1;

  const setSearchTerm = useCallback((q: string) => setSearchTermLocal(q), []);
  const setDeptFilter = useCallback(
    (d: string) => updateParams({ dept: d === "All" ? null : d, page: null }),
    [updateParams],
  );
  const setStatusFilter = useCallback(
    (s: StatusFilter) =>
      updateParams({ status: s === "Active" ? null : s, page: null }),
    [updateParams],
  );
  const setRoleFilter = useCallback(
    (r: RoleFilter) =>
      updateParams({ role: r === "All" ? null : r, page: null }),
    [updateParams],
  );
  const setPage = useCallback(
    (p: number) => updateParams({ page: p === 1 ? null : String(p) }),
    [updateParams],
  );

  const handlePageSizeChange = useCallback(
    (size: number) =>
      updateParams({
        size: size === PAGE_SIZE ? null : String(size),
        page: null,
      }),
    [updateParams],
  );

  const handleDelete = useCallback(async () => {
    if (!employeeToDelete) return;
    terminateMutation.mutate(employeeToDelete.id, {
      onSuccess: () => {
        toast.success("Employee terminated");
        setDeleteDialogOpen(false);
        setEmployeeToDelete(null);
      },
      onError: () => toast.error("Failed to terminate employee"),
    });
  }, [employeeToDelete, terminateMutation]);

  const handleExport = useCallback(async () => {
    const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
    const rows = employees.map((e) => ({
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
  }, [employees]);

  const handleClearFilters = useCallback(() => {
    setSearchTermLocal("");
    updateParams({
      q: null,
      dept: null,
      status: null,
      role: null,
      page: null,
    });
  }, [updateParams]);

  const handleRequestDelete = useCallback((employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  }, []);

  if (isLoading && !paginatedResult) return <EmployeesLoadingSkeleton />;

  const showFrom = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const showTo = Math.min(page * pageSize, totalCount);
  const hasActiveFilters =
    !!searchTerm ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  return (
    <PageWrapper
      title="Employees"
      subtitle="Manage your company directory and employee access"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
          >
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
          departments={departmentNames}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          roleFilter={roleFilter}
          onRoleChange={setRoleFilter}
          onClearFilters={handleClearFilters}
        />
      }
    >
      <HrDashboardOverview />

      {employees.length > 0 ? (
        <HrEmployeeTable
          employees={employees}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          showFrom={showFrom}
          showTo={showTo}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
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
          action={{ label: "Add Employee", href: "/hr/onboarding" }}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Terminate Employee"
        description={
          employeeToDelete
            ? `Are you sure you want to terminate ${employeeToDelete.firstName ?? ""} ${employeeToDelete.lastName ?? ""}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Terminate"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
