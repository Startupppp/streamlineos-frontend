"use client";

import { ReactNode } from "react";
import { useAbility } from "@/lib/abilities-context";

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

function canDo(ability: ReturnType<typeof useAbility>, permission: string): boolean {
  const [domain, resource, action] = permission.split(":");
  if (!domain || !resource || !action) return false;
  return ability.can(action, `${domain}:${resource}`);
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const ability = useAbility();

  let hasAccess = false;

  if (permission) {
    hasAccess = canDo(ability, permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? permissions.every((p) => canDo(ability, p))
      : permissions.some((p) => canDo(ability, p));
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
