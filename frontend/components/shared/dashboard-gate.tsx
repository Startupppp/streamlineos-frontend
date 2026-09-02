"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { AccessDenied } from "./access-denied";
import { ErrorState } from "./error-state";
import { useAccess } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

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
  const {
    data: access,
    isLoading: accessLoading,
    isError: accessFailed,
    refetch,
  } = useAccess();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Session/access refreshes must not unmount the current page. The branded
  // loading screen is only appropriate before we have an authorization
  // snapshot; background refetches keep rendering the last verified state.
  if ((status === "loading" && !session) || (accessLoading && !access)) {
    return <AppLoadingScreen />;
  }

  // A failed authorization read is not a refusal. Falling through to
  // AccessDenied told the reader they lack a permission when in fact nothing
  // was ever read, and offered no way to try again.
  if (accessFailed && !access) {
    return (
      <ErrorState
        title="Couldn't check your access"
        description="Your permissions could not be read, so this page cannot be shown yet. Please try again."
        onRetry={handleRetry}
      />
    );
  }

  const userRole = session?.user?.role;

  const isOrgOwner = access?.isOrgOwner ?? session?.user?.isOrgOwner ?? false;

  if (!userRole)
    return (
      <AccessDenied
        currentRole={undefined}
        requiredRoles={allowedRoles ?? []}
      />
    );

  if (isOrgOwner) return <>{children}</>;

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    const granted = perms.some((p) => (access ? p in access.scopes : false));
    if (granted) return <>{children}</>;
    return (
      <AccessDenied currentRole={userRole} requiredRoles={allowedRoles ?? []} />
    );
  }

  if (allowedRoles && userRole && allowedRoles.includes(userRole))
    return <>{children}</>;

  return (
    <AccessDenied currentRole={userRole} requiredRoles={allowedRoles ?? []} />
  );
}
