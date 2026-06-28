"use client";

import { useSession } from "next-auth/react";
import { AccessDenied } from "./access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/lib/api/hooks/access";

interface DashboardGateProps {
  allowedRoles?: string[];
  permission?: string | string[];
  children: React.ReactNode;
}

export function DashboardGate({ allowedRoles, permission, children }: DashboardGateProps) {
  const { data: session, status } = useSession();
  const { data: access } = useAccess();

  if (status === "loading") {
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
  const isPlatformAdmin = session?.user?.isPlatformAdmin ?? false;
  const isOrgOwner = access?.isOrgOwner ?? session?.user?.isOrgOwner ?? false;

  if (!userRole && !isPlatformAdmin) {
    return (
      <AccessDenied
        currentRole={undefined}
        requiredRoles={allowedRoles ?? []}
      />
    );
  }

  if (isPlatformAdmin || isOrgOwner) {
    return <>{children}</>;
  }

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    const granted = perms.some((p) => access?.permissions.includes(p) ?? false);
    if (granted) return <>{children}</>;
    return (
      <AccessDenied
        currentRole={userRole}
        requiredRoles={allowedRoles ?? []}
      />
    );
  }

  if (allowedRoles && userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return (
    <AccessDenied
      currentRole={userRole}
      requiredRoles={allowedRoles ?? []}
    />
  );
}
