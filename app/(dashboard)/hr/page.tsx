"use client";

import { memo, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { EmptySearchIllustration, EmptyTeamIllustration } from "@/components/illustrations";
import { getEmployees, deleteEmployee } from "@/server/actions/hr-actions";
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

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: "ADMIN" | "MEMBER" | "OWNER" | "CLIENT";
  image: string | null;
}

type UserRole = "ADMIN" | "MEMBER" | "OWNER" | "CLIENT";

function canDeleteEmployee(
  targetRole: UserRole,
  targetId: string,
  currentRole: string | undefined,
  currentId: string | undefined,
): boolean {
  if (targetId === currentId) return false;
  if (currentRole === "OWNER") return targetRole !== "OWNER";
  if (currentRole === "ADMIN") return targetRole === "MEMBER";
  return false;
}

function getDisplayName(employee: Employee): string {
  if (employee.firstName) return `${employee.firstName} ${employee.lastName ?? ""}`.trim();
  return employee.email;
}

export default function HRDashboardPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(
      (e) =>
        e.email.toLowerCase().includes(term) ||
        (e.firstName && e.firstName.toLowerCase().includes(term)) ||
        (e.lastName && e.lastName.toLowerCase().includes(term)) ||
        e.role.toLowerCase().includes(term),
    );
  }, [employees, searchTerm]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getEmployees();
        if (!cancelled) setEmployees(data);

        try {
          const { markOnboardingNotificationsAsRead } = await import(
            "@/server/actions/notification-actions"
          );
          await markOnboardingNotificationsAsRead();
        } catch {
          // Non-critical — badge clear is best-effort
        }
      } catch (err) {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={`emp-skel-${i}`} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={`Directory of all members in this organization (${employees.length}).`}
        actions={
          <Link href="/hr/onboarding">
            <Button>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Employee
            </Button>
          </Link>
        }
      />

      {employees.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            aria-label="Search employees"
          />
        </div>
      )}

      {filteredEmployees.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Employee directory">
          {filteredEmployees.map((user) => {
            const displayName = getDisplayName(user);
            return (
              <Card
                key={user.id}
                className="bg-card border-border hover:shadow-md transition-all group relative"
                role="listitem"
              >
                <Link
                  href={`/hr/employees/${user.id}`}
                  className="absolute inset-0 z-0"
                  aria-label={`View ${displayName}'s profile`}
                />
                <CardHeader className="flex flex-row items-start justify-between gap-4 relative z-10 pointer-events-none">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-border">
                      <AvatarImage
                        src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName ?? user.email}`}
                        alt=""
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {(user.firstName ?? user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {displayName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="pointer-events-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Actions for ${displayName}`}
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
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
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 pointer-events-none pt-0">
                  <Badge
                    variant={user.role === "ADMIN" || user.role === "OWNER" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {user.role}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : searchTerm ? (
        <EmptyState
          illustration={<EmptySearchIllustration className="mb-3" />}
          title="No results found"
          description={`No employees match "${searchTerm}". Try a different search.`}
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
