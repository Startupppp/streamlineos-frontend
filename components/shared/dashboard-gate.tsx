"use client";

import { useSession } from "next-auth/react";
import { AccessDenied } from "./access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { isSuperAdminRole } from "@/lib/rbac/permissions";
import { usePermissions } from "@/lib/rbac/hooks";

interface DashboardGateProps {
  allowedRoles?: string[];
  permission?: string | string[];
  children: React.ReactNode;
}

export function DashboardGate({ allowedRoles, permission, children }: DashboardGateProps) {
  const { data: session, status } = useSession();
  const { hasAnyPermission, isLoading: permsLoading } = usePermissions();

  if (status === "loading" || (permission && permsLoading)) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const userRole = session?.user?.role;

  if (!userRole) {
    return (
      <AccessDenied
        currentRole={undefined}
        requiredRoles={allowedRoles ?? []}
      />
    );
  }

  if (isSuperAdminRole(userRole)) {
    return <>{children}</>;
  }

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    if (hasAnyPermission(perms)) return <>{children}</>;
    return (
      <AccessDenied
        currentRole={userRole}
        requiredRoles={allowedRoles ?? []}
      />
    );
  }

  if (allowedRoles && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return (
    <AccessDenied
      currentRole={userRole}
      requiredRoles={allowedRoles ?? []}
    />
  );
}
