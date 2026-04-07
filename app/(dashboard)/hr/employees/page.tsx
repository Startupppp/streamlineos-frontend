"use client";

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

import { useSession } from "next-auth/react";


import { Button } from "@/components/ui/button"; // Correct path
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEmployees, deleteEmployee } from "@/server/actions/hr-actions"; // Import action
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EmployeeDirectoryPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  interface Employee {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: "ADMIN" | "MEMBER" | "OWNER" | "CLIENT";
    image: string | null;
  }
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to determine if current user can delete target employee
  const canDeleteEmployee = (targetEmployee: Employee) => {
    // Cannot delete yourself
    if (targetEmployee.id === currentUserId) return false;
    
    // Owners can delete ADMINs and MEMBERs (not other OWNERs)
    if (currentUserRole === "OWNER") {
      return targetEmployee.role !== "OWNER";
    }
    
    // Admins can only delete MEMBERs
    if (currentUserRole === "ADMIN") {
      return targetEmployee.role === "MEMBER";
    }
    
    return false;
  };

  useEffect(() => {
    async function load() {
        try {
            const data = await getEmployees();
            setEmployees(data);
            
            // Mark notifications as read
             try {
                const { markOnboardingNotificationsAsRead } = await import("@/server/actions/notification-actions");
                await markOnboardingNotificationsAsRead();
             } catch { 
                 // ignore 
             }
        } catch {
        } finally {
            setLoading(false);
        }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
             <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Employees
          </h2>
          <p className="text-muted-foreground">
            Directory of all members in this organization.
          </p>
        </div>
        <Link href="/hr/onboarding">
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
            </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees && employees.length > 0 ? (
          employees.map((user) => (
            <Card key={user.id} className="bg-card border-border hover:shadow-md transition-all group relative overflow-hidden">
                <Link href={`/hr/employees/${user.id}`} className="absolute inset-0 z-0" aria-label={`View ${user.firstName}'s profile`} />
                <CardHeader className="flex flex-row items-center gap-4 relative z-10 pointer-events-none">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName || user.email}`} 
                    alt={`${user.firstName || user.email}'s avatar`} 
                  />
                  <AvatarFallback>
                    {(user.firstName || user.email)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-foreground text-lg group-hover:text-primary transition-colors">
                    {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pointer-events-none">
                <div className="flex gap-2 items-center w-full justify-between mt-4">
                  <Badge variant={user.role === "ADMIN" || user.role === "OWNER" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                  <div className="flex gap-2 pointer-events-auto">
                      <Link href={`/hr/employees/${user.id}?tab=profile`}>
                        <Button variant="outline" size="sm">
                            Edit
                        </Button>
                      </Link>
                      {canDeleteEmployee(user) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="h-8 w-8"
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate {user.firstName || "this employee"}? 
                                  They will lose access to the system immediately. 
                                  Their past records will be preserved.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={async () => {
                                     await deleteEmployee(user.id);
                                     setEmployees(prev => prev.filter(e => e.id !== user.id));
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No employees found. Click &quot;Add Employee&quot; to get started.

          </div>
        )}
      </div>
    </div>
  );
}

