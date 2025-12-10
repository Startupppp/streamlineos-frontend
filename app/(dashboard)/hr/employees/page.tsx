"use client";

import { useGetOrganizations } from "../../../../lib/hooks/auth-hooks";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Skeleton } from "../../../../components/ui/skeleton";
import { vaivammTrpcClient } from "../../../../lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export default function EmployeeDirectoryPage() {
  const { data: session } = useSession();
  const { data: organizations } = useGetOrganizations();
  const orgId = organizations?.[0]?.id;

  const { data: users, isLoading } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      // TODO: Create a tRPC endpoint to get organization members
      // For now, return empty array
      return [];
    },
    enabled: !!orgId,
  });

  if (isLoading) {
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
            <Card key={i} className="bg-card border-border">
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Employees
          </h2>
          <p className="text-muted-foreground">
            Please select an organization to view employees.
          </p>
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users && users.length > 0 ? (
          users.map((user: { id: string; firstName?: string; lastName?: string; email: string; role: string }) => (
            <Card key={user.id} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {user.firstName?.charAt(0)}
                    {user.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-foreground text-lg">
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant={user.role === "ADMIN" || user.role === "OWNER" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No employees found. Use the invitation system to add members.
          </div>
        )}
      </div>
    </div>
  );
}
