"use client";

import {
  Avatar,
  AvatarFallback,
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function HRDashboardPage() {
  interface Employee {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: "ADMIN" | "MEMBER" | "OWNER" | "CLIENT";
  }
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getEmployees();
        setEmployees(data);
        
        try {
          const { markOnboardingNotificationsAsRead } = await import("@/server/actions/notification-actions");
          await markOnboardingNotificationsAsRead();
        } catch { 
          // ignore 
        }
      } catch (e) {
        // Error handling
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    await deleteEmployee(employeeToDelete.id);
    setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

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
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Directory of all members in this organization."
        actions={
          <Link href="/hr/onboarding">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        }
      />

      {employees && employees.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((user) => (
            <Card 
              key={user.id} 
              className="bg-card border-border hover:shadow-md transition-all group relative"
            >
              <Link 
                href={`/hr/employees/${user.id}`} 
                className="absolute inset-0 z-0" 
                aria-label={`View ${user.firstName}'s profile`} 
              />
              <CardHeader className="flex flex-row items-start justify-between gap-4 relative z-10 pointer-events-none">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {(user.firstName || user.email)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                
                {/* Overflow Menu */}
                <div className="pointer-events-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/hr/employees/${user.id}?tab=profile`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Profile
                        </Link>
                      </DropdownMenuItem>
                      {(user.role !== "OWNER" && user.role !== "ADMIN") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setEmployeeToDelete(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Get started by adding your first team member."
          action={{
            label: "Add Employee",
            onClick: () => window.location.href = "/hr/onboarding"
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {employeeToDelete?.firstName || "this employee"}? 
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

