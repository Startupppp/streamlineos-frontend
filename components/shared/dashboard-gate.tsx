"use client";

import { useSession } from "next-auth/react";
import { AccessDenied } from "./access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { useAbility } from "@/lib/abilities-context";

interface DashboardGateProps {
  allowedRoles?: string[];
  permission?: string | string[];
  children: React.ReactNode;
}

function permissionGrants(ability: ReturnType<typeof useAbility>, permission: string): boolean {
  const [domain, resource, action] = permission.split(":");
  if (!domain || !resource || !action) return false;
  return ability.can(action, `${domain}:${resource}`);
}

export function DashboardGate({ allowedRoles, permission, children }: DashboardGateProps) {
  const { data: session, status } = useSession();
  const ability = useAbility();

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
  const isOrgOwner = session?.user?.isOrgOwner ?? false;

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
    if (perms.some((p) => permissionGrants(ability, p))) return <>{children}</>;
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
