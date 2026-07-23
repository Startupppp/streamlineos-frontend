"use client";

import { useSession } from "next-auth/react";
import { AccessDenied } from "./access-denied";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { useAccess } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface DashboardGateProps {
  allowedRoles?: string[];
  permission?: PermissionKey | PermissionKey[];
  children: React.ReactNode;
}

export function DashboardGate({
  allowedRoles,
  permission,
  children,
}: DashboardGateProps) {
  const { data: session, status } = useSession();
  const { data: access, isLoading: accessLoading } = useAccess();

  if (status === "loading" || accessLoading) {
    return <AppLoadingScreen />;
  }

  const userRole = session?.user?.role;
  const isPlatformAdmin =
    access?.isPlatformAdmin ?? session?.user?.isPlatformAdmin ?? false;
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
      <AccessDenied currentRole={userRole} requiredRoles={allowedRoles ?? []} />
    );
  }

  if (allowedRoles && userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return (
    <AccessDenied currentRole={userRole} requiredRoles={allowedRoles ?? []} />
  );
}
