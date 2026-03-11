"use client";

import { memo, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import { Switch } from "@/components/ui/switch";
import { getEmployees, deleteEmployee, toggleDashboardAccess } from "@/server/actions/hr-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  image: string | null;
  designation: string | null;
  isActive: boolean;
  hasDashboardAccess: boolean;
  department: { id: number; name: string } | null;
}

type UserRole = string;
type StatusFilter = "All" | "Active" | "Inactive";
type RoleFilter = "All" | "CEO" | "HR" | "SALES" | "CRM" | "DIGITAL_MARKETING" | "DESIGN_TEAM" | "VIDEO_EDITOR" | "ENGINEER";

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  HR: "HR",
  SALES: "Sales",
  CRM: "CRM",
  DIGITAL_MARKETING: "Digital Marketing",
  DESIGN_TEAM: "Design Team",
  VIDEO_EDITOR: "Video Editor",
  ENGINEER: "Engineer",
};

const PAGE_SIZE = 6;

function canDeleteEmployee(
  targetRole: UserRole,
  targetId: string,
  currentRole: string | undefined,
  currentId: string | undefined,
): boolean {
  if (targetId === currentId) return false;
  if (currentRole === "CEO") return targetRole !== "CEO";
  if (currentRole === "HR") return targetRole !== "CEO" && targetRole !== "HR";
  return false;
}

function getDisplayName(employee: Employee): string {
  if (employee.firstName) return `${employee.firstName} ${employee.lastName ?? ""}`.trim();
  return employee.email;
}

function getInitials(employee: Employee): string {
  if (employee.firstName && employee.lastName) {
    return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
  }
  return employee.email.charAt(0).toUpperCase();
}

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
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [page, setPage] = useState(1);

  // Derive unique departments
  const departments = useMemo(() => {
    const deptSet = new Map<string, string>();
    employees.forEach((e) => {
      if (e.department) deptSet.set(e.department.name, e.department.name);
    });
    return Array.from(deptSet.values()).sort();
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        result = result.filter((e) => {
          const name = getDisplayName(e).toLowerCase();
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
  }, [employees, searchTerm, deptFilter, statusFilter, roleFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, page]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchTerm, deptFilter, statusFilter, roleFilter]);

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
    return () => { cancelled = true; };
  }, []);

  const handleDelete = useCallback(async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete.id);
      setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
      toast.success("Employee deactivated");
    } catch {
      toast.error("Failed to deactivate employee");
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  }, [employeeToDelete]);

  const handleToggleDashboardAccess = useCallback(async (userId: string, newValue: boolean) => {
    setTogglingAccess((prev) => new Set(prev).add(userId));
    try {
      const result = await toggleDashboardAccess(userId, newValue);
      if (result.error) {
        toast.error(result.error);
      } else {
        setEmployees((prev) =>
          prev.map((e) => (e.id === userId ? { ...e, hasDashboardAccess: newValue } : e))
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
  }, []);

  if (loading) {
    return <EmployeesLoadingSkeleton />;
  }

  const showFrom = filteredEmployees.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const showTo = Math.min(page * PAGE_SIZE, filteredEmployees.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage your company directory and employee access"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const headers = ["Name", "Email", "Role", "Department", "Status"];
                const rows = filteredEmployees.map((e) => [
                  getDisplayName(e),
                  e.email,
                  e.designation ?? ROLE_LABELS[e.role] ?? e.role,
                  e.department?.name ?? "",
                  e.isActive !== false ? "Active" : "Inactive",
                ]);
                const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Employees exported successfully");
              }}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export
            </Button>
            <Link href="/hr/onboarding">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Employee
              </Button>
            </Link>
          </div>
        }
      />

      {/* Search & Filters */}
      <Card className="border-border">
        <CardContent className="py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
                aria-label="Search employees"
              />
            </div>

            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="Dept: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Dept: All</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Status: All</SelectItem>
                <SelectItem value="Active">Status: Active</SelectItem>
                <SelectItem value="Inactive">Status: Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
              <SelectTrigger className="h-9 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Role: All</SelectItem>
                <SelectItem value="CEO">CEO</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="SALES">Sales</SelectItem>
                <SelectItem value="CRM">CRM</SelectItem>
                <SelectItem value="DIGITAL_MARKETING">Digital Marketing</SelectItem>
                <SelectItem value="DESIGN_TEAM">Design Team</SelectItem>
                <SelectItem value="VIDEO_EDITOR">Video Editor</SelectItem>
                <SelectItem value="ENGINEER">Engineer</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Clear filters"
              onClick={() => { setSearchTerm(""); setDeptFilter("All"); setStatusFilter("Active"); setRoleFilter("All"); }}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      {paginatedEmployees.length > 0 ? (
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto" role="region" aria-label="Employee directory table" tabIndex={0}>
              <table className="w-full">
                <caption className="sr-only">Employee directory table</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Name</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Email</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Role</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Department</th>
                    <th scope="col" className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Status</th>
                    {(currentUserRole === "CEO" || currentUserRole === "HR") && (
                      <th scope="col" className="text-center text-xs font-medium text-muted-foreground py-3 px-4">Dashboard</th>
                    )}
                    <th scope="col" className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((user) => {
                    const displayName = getDisplayName(user);
                    const initials = getInitials(user);
                    const isActive = user.isActive !== false;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
                      >
                        {/* Name */}
                        <td className="py-3 px-4">
                          <Link href={`/hr/employees/${user.id}`} className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={resolveImageUrl(user.image)} alt="" />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {displayName}
                            </span>
                          </Link>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {user.email}
                        </td>

                        {/* Designation/Role */}
                        <td className="py-3 px-4">
                          {user.designation ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {user.designation}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Department */}
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {user.department?.name ?? "—"}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1.5 ${
                              isActive
                                ? "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-500/10"
                                : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-500/10"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        {/* Dashboard Access Toggle */}
                        {(currentUserRole === "CEO" || currentUserRole === "HR") && (
                          <td className="py-3 px-4 text-center">
                            {user.role === "CEO" || user.id === currentUserId ? (
                              <Switch
                                checked={true}
                                disabled
                                aria-label="Dashboard access always on"
                              />
                            ) : (
                              <Switch
                                checked={user.hasDashboardAccess}
                                disabled={togglingAccess.has(user.id)}
                                onCheckedChange={(checked) => handleToggleDashboardAccess(user.id, checked)}
                                aria-label={`Toggle dashboard access for ${displayName}`}
                              />
                            )}
                          </td>
                        )}

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={`Actions for ${displayName}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/hr/employees/${user.id}?tab=profile`}>
                                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Edit Profile
                                </Link>
                              </DropdownMenuItem>
                              {canDeleteEmployee(user.role, user.id, currentUserRole, currentUserId) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      setEmployeeToDelete(user);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Deactivate
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-gold font-medium">
                Showing {showFrom}-{showTo} of {filteredEmployees.length} employees
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 text-xs"
                  aria-label="Go to previous page"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground" aria-current="page">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 text-xs"
                  aria-label="Go to next page"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : searchTerm || deptFilter !== "All" || statusFilter !== "Active" || roleFilter !== "All" ? (
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
            onClick: () => { window.location.href = "/hr/onboarding"; },
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {employeeToDelete?.firstName ?? "this employee"}?
              They will lose access to the system immediately.
              Their past records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmployeesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <Card className="border-border">
        <CardContent className="py-3">
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-[130px]" />
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-9 w-[120px]" />
            <Skeleton className="h-9 w-9" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3 flex gap-8">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-14 ml-auto" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-7 w-7 ml-auto rounded" />
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
