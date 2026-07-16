"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  Users,
  UserPlus,
  CalendarOff,
  ClipboardList,
  Briefcase,
} from "lucide-react";
import {
  EmptySearchIllustration,
  EmptyTeamIllustration,
} from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useHrEmployees,
  useHrDepartments,
  useTerminateEmployee,
  unwrapEmployees,
} from "@/hooks/api/hr";

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
import {
  HrHero,
  HrPageContent,
  HrPanel,
  HrQuickAction,
  HrSectionHeader,
} from "@/features/hr/shared/hr-ui";

export default function HRDashboardPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

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

  const { data: departments } = useHrDepartments();
  const departmentId = useMemo(() => {
    if (deptFilter === "All") return undefined;
    return departments?.find((d) => d.name === deptFilter)?.id;
  }, [deptFilter, departments]);

  const isActiveParam =
    statusFilter === "Active" ? "true" : statusFilter === "Inactive" ? "false" : "all";

  // Server-side directory page — never treat the response as a raw array
  const {
    data: employeesPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useHrEmployees({
    page,
    limit: pageSize,
    search: debouncedSearchTerm || undefined,
    departmentId,
    isActive: isActiveParam,
  });

  const terminateMutation = useTerminateEmployee();

  const employees = useMemo(
    () => unwrapEmployees(employeesPage) as unknown as Employee[],
    [employeesPage],
  );

  // Client role filter (API has no role param yet)
  const displayEmployees = useMemo(() => {
    if (roleFilter === "All") return employees;
    return employees.filter((e) => e.role === roleFilter);
  }, [employees, roleFilter]);

  const pagination = employeesPage?.pagination;
  const totalCount = pagination?.total ?? displayEmployees.length;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

  const departmentNames = useMemo(
    () => (departments ?? []).map((d) => d.name).sort((a, b) => a.localeCompare(b)),
    [departments],
  );

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
    (r: RoleFilter) => updateParams({ role: r === "All" ? null : r, page: null }),
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
    // Export current page results (server-filtered). For full export use higher limit.
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const rows = displayEmployees.map((e) => ({
        name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email,
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
            { header: "Email", key: "email", width: 30 },
            { header: "Role", key: "role", width: 20 },
            { header: "Department", key: "department", width: 20 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows,
        },
      ]);
      toast.success("Employees exported");
    } catch {
      toast.error("Export failed");
    }
  }, [displayEmployees]);

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

  if (isLoading) return <EmployeesLoadingSkeleton />;

  const showFrom = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const showTo = Math.min(page * pageSize, totalCount);
  const hasActiveFilters =
    !!searchTerm ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  return (
    <PageWrapper
      title="People Hub"
      subtitle="Directory, headcount, and day-to-day people ops"
 variant="display"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={handleExport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </Button>
          <Button size="sm" className="gap-2 h-9 shadow-sm" asChild>
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
      <HrPageContent>
        <HrHero
          eyebrow="Streamline HRMS"
          title="Build teams. Keep people thriving."
          description="Onboard faster, track leave and attendance, and run the full employee lifecycle from one calm workspace."
          actions={
            <>
              <Button size="sm" className="h-9 gap-1.5 shadow-sm" asChild>
                <Link href="/hr/onboarding">
                  <UserPlus className="h-3.5 w-3.5" />
                  Onboard
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 border-blue-200 bg-white/80 text-slate-700 hover:bg-white dark:border-blue-800 dark:bg-slate-900/50 dark:text-slate-200"
                asChild
              >
                <Link href="/hr/employees">
                  <Users className="h-3.5 w-3.5" />
                  Directory
                </Link>
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <HrQuickAction
              href="/hr/onboarding"
              icon={UserPlus}
              label="Onboarding"
              description="Single or bulk hire"
              tone="blue"
            />
            <HrQuickAction
              href="/hr/leaves"
              icon={CalendarOff}
              label="Leaves"
              description="Requests & balances"
              tone="amber"
            />
            <HrQuickAction
              href="/hr/attendance"
              icon={ClipboardList}
              label="Attendance"
              description="Daily presence"
              tone="emerald"
            />
            <HrQuickAction
              href="/hr/recruitment"
              icon={Briefcase}
              label="Recruitment"
              description="Jobs & pipeline"
              tone="violet"
            />
          </div>
        </HrHero>

        <HrDashboardOverview />

        <div>
          <HrSectionHeader
            title="Employee directory"
            description={
              isFetching && !isLoading
                ? "Updating results…"
                : `${totalCount.toLocaleString()} people · page ${page} of ${totalPages}`
            }
            action={{ label: "Full directory", href: "/hr/employees" }}
          />

          {isError ? (
            <HrPanel className="text-center py-10">
              <p className="text-sm font-semibold text-foreground">Couldn’t load employees</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Check your connection and try again.
              </p>
              <Button size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </HrPanel>
          ) : displayEmployees.length > 0 ? (
            <HrPanel padded={false} className="overflow-hidden">
              <HrEmployeeTable
                employees={displayEmployees}
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
            </HrPanel>
          ) : hasActiveFilters ? (
            <EmptyState
              illustration={<EmptySearchIllustration className="mb-3" />}
              title="No results found"
              description="No employees match your current filters. Try adjusting your search."
              action={{ label: "Clear filters", onClick: handleClearFilters }}
            />
          ) : (
            <EmptyState
              illustration={<EmptyTeamIllustration className="mb-3" />}
              title="No employees yet"
              description="Get started by adding your first team member — or bulk-import a whole cohort."
              action={{ label: "Add Employee", href: "/hr/onboarding" }}
            />
          )}
        </div>

      </HrPageContent>

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
