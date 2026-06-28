"use client";

import { ReactNode } from "react";
import { useAccess } from "@/lib/api/hooks/access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { Tier } from "@/types/access";

const TIER_RANK: Record<Tier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

interface CanProps {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { data } = useAccess();
  if (!data) return null;
  if (!data.isOrgOwner && !data.permissions.includes(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

export function useModuleEnabled(module: string): boolean {
  const { data } = useAccess();
  if (!data) return false;
  return Boolean(data.modules[module]);
}

interface RequireModuleProps {
  module: string;
  minTier?: Tier;
  children: ReactNode;
}

function UpgradePrompt({ module }: { module: string }) {
  return (
    <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
      Upgrade to access {module}
    </div>
  );
}

export function RequireModule({ module, minTier, children }: RequireModuleProps) {
  const { data, isLoading } = useAccess();

  if (isLoading) return null;
  if (!data) return null;

  const enabled = Boolean(data.modules[module]);
  if (!enabled) {
    return <UpgradePrompt module={module} />;
  }

  if (minTier !== undefined) {
    const currentRank = data.tier !== undefined ? TIER_RANK[data.tier] : 0;
    const requiredRank = TIER_RANK[minTier];
    if (currentRank < requiredRank) {
      return <UpgradePrompt module={module} />;
    }
  }

  return <>{children}</>;
}
