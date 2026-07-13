"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Info,
  CheckCircle2,
  XCircle,
  Lock,
  ShieldOff,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ErrorState } from "@/components/shared/error-state";
import { useRolePermissionsMatrix } from "@/hooks/api/roles";
import type { RolePermissionsMatrixEntry } from "@/hooks/api/roles";
import { cn } from "@/lib/utils";

function groupByResource(permissions: typeof PERMISSIONS) {
  const groups: Record<string, typeof PERMISSIONS> = {};
  for (const perm of permissions) {
    const key = perm.resource;
    if (!groups[key]) groups[key] = [];
    groups[key].push(perm);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function formatResource(resource: string) {
  return resource
    .replace(/:/g, " › ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PermissionsPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <PermissionsContent />
    </DashboardGate>
  );
}

function PermissionsContent() {
  const { data: session } = useSession();
  const matrixQuery = useRolePermissionsMatrix();
  const handleRetry = useCallback(() => {
    void matrixQuery.refetch();
  }, [matrixQuery]);

  const permissionGroups = useMemo(() => groupByResource(PERMISSIONS), []);

  const rolePermSets = useMemo<Map<number, Set<string>>>(() => {
    const result = new Map<number, Set<string>>();
    for (const entry of matrixQuery.data ?? []) {
      result.set(entry.roleId, new Set(entry.permissions));
    }
    return result;
  }, [matrixQuery.data]);

  const roles = matrixQuery.data ?? [];
  const currentUserRoleId = roles.find(
    (r) => r.roleName === session?.user?.role,
  )?.roleId;

  if (matrixQuery.isLoading) {
    return (
      <PageWrapper
        title="Permission Matrix"
        subtitle="Read-only overview of built-in permissions per system role"
        eyebrow="Settings"
      >
        <MatrixSkeleton />
      </PageWrapper>
    );
  }

  if (matrixQuery.isError) {
    return (
      <PageWrapper
        title="Permission Matrix"
        subtitle="Read-only overview of built-in permissions per system role"
        eyebrow="Settings"
      >
        <ErrorState
          title="Failed to load permissions"
          description="Failed to fetch permissions. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[320px]"
        />
      </PageWrapper>
    );
  }

  if (roles.length === 0) {
    return (
      <PageWrapper
        title="Permission Matrix"
        subtitle="Read-only overview of built-in permissions per system role"
        eyebrow="Settings"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
          <ShieldOff className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No roles found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create roles in{" "}
              <Link
                href="/settings/roles"
                className="underline underline-offset-2"
              >
                Roles &amp; Permissions
              </Link>{" "}
              to see them here.
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Permission Matrix"
      subtitle="Read-only overview of permissions per role"
      eyebrow="Settings"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This is a read-only view of all role permissions. To edit
            permissions or assign custom roles, go to{" "}
            <Link
              href="/settings/roles"
              className="underline underline-offset-2 font-medium"
            >
              Roles &amp; Permissions
            </Link>
            .
          </p>
        </div>

        <div className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto scrollbar-thin">
          {roles.map((role) => (
            <Badge
              key={role.roleId}
              variant={
                role.roleId === currentUserRoleId ? "default" : "outline"
              }
              className={cn(
                "shrink-0 text-[11px]",
                role.roleId === currentUserRoleId &&
                  "bg-primary text-primary-foreground",
              )}
            >
              {role.roleName}
            </Badge>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              Permission Matrix ({PERMISSIONS.length} permissions ·{" "}
              {roles.length} roles)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[900px]">
                <div
                  className="grid bg-muted/50 border-b border-border/40 sticky top-0 z-10"
                  style={{
                    gridTemplateColumns: `260px repeat(${roles.length}, minmax(72px, 1fr))`,
                  }}
                >
                  <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground sticky left-0 z-20 bg-muted/50">
                    Permission
                  </div>
                  {roles.map((role) => (
                    <div
                      key={role.roleId}
                      className={cn(
                        "px-2 py-2.5 text-center text-[11px] font-semibold leading-tight text-muted-foreground",
                        role.roleId === currentUserRoleId && "text-primary",
                      )}
                    >
                      {role.roleName}
                    </div>
                  ))}
                </div>

                {permissionGroups.map(([resource, perms]) => (
                  <div key={resource}>
                    <div
                      className="grid bg-muted/20 border-b border-border/30"
                      style={{
                        gridTemplateColumns: `260px repeat(${roles.length}, minmax(72px, 1fr))`,
                      }}
                    >
                      <div className="px-4 py-1.5 col-span-full text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {formatResource(resource)}
                      </div>
                    </div>

                    {perms.map((perm) => (
                      <PermissionRow
                        key={perm.name}
                        permName={perm.name}
                        permDescription={perm.description}
                        permAction={perm.action}
                        roles={roles}
                        rolePermSets={rolePermSets}
                        currentUserRoleId={currentUserRoleId}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

interface PermissionRowProps {
  permName: string;
  permDescription: string;
  permAction: string;
  roles: RolePermissionsMatrixEntry[];
  rolePermSets: Map<number, Set<string>>;
  currentUserRoleId: number | undefined;
}

function PermissionRow({
  permName,
  permDescription,
  permAction,
  roles,
  rolePermSets,
  currentUserRoleId,
}: PermissionRowProps) {
  return (
    <div
      className="grid border-b border-border/20 hover:bg-muted/10 transition-colors"
      style={{
        gridTemplateColumns: `260px repeat(${roles.length}, minmax(72px, 1fr))`,
      }}
    >
      <div className="px-4 py-2 flex flex-col justify-center sticky left-0 z-10 bg-card">
        <p className="text-[12px] font-medium leading-snug">
          {permDescription}
        </p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {formatAction(permAction)}
        </p>
      </div>

      {roles.map((role) => {
        const hasPermission =
          rolePermSets.get(role.roleId)?.has(permName) ?? false;
        return (
          <div
            key={role.roleId}
            className={cn(
              "flex items-center justify-center py-2",
              role.roleId === currentUserRoleId && "bg-primary/5",
            )}
          >
            {hasPermission ? (
              <CheckCircle2
                className="h-4 w-4 text-emerald-500"
                aria-label="Allowed"
              />
            ) : (
              <XCircle
                className="h-3.5 w-3.5 text-muted-foreground/30"
                aria-label="Not allowed"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto scrollbar-thin">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/20">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                <Skeleton className="h-4 w-48" />
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-4 rounded-full" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
