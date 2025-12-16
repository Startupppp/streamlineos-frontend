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

import { useSession } from "next-auth/react";


import { Button } from "@/components/ui/button"; // Correct path
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEmployees } from "@/server/actions/hr-actions"; // Import action

export default function EmployeeDirectoryPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
        try {
            const data = await getEmployees();
            setEmployees(data);
            
            // Mark notifications as read
             try {
                const { markOnboardingNotificationsAsRead } = await import("@/server/actions/notification-actions");
                await markOnboardingNotificationsAsRead();
             } catch (ign) { 
                 // ignore 
             }
        } catch (e) {
            console.error(e);
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
        <Link href="/hr/employees/new">
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
            </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees && employees.length > 0 ? (
          employees.map((user: { id: string; firstName?: string; lastName?: string; email: string; role: string }) => (
            <Card key={user.id} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {(user.firstName || user.email)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-foreground text-lg">
                    {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center w-full justify-between mt-4">
                  <Badge variant={user.role === "ADMIN" || user.role === "OWNER" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                  <Link href={`/hr/employees/${user.id}`}>
                    <Button variant="outline" size="sm">
                        Edit
                    </Button>
                  </Link>
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

