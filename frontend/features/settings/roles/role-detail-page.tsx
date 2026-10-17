"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Shield, Calendar, Globe, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { RoleEditorSkeleton } from "@/features/settings/roles/role-editor-skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { RoleAssignmentsSheet } from "@/components/rbac/role-assignments-sheet";
import { useRole, useRoleMembers } from "@/hooks/api/roles";

interface RoleDetailPageProps {
  roleId: string;
}

export function RoleDetailPage({ roleId }: RoleDetailPageProps) {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <RoleEditorContent roleId={roleId} />
    </DashboardGate>
  );
}

function RoleEditorContent({ roleId: roleIdParam }: RoleDetailPageProps) {
  const router = useRouter();
  const roleId = Number(roleIdParam);

  const roleQuery = useRole(roleId);
  const membersQuery = useRoleMembers(roleId);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);

  const handleBack = useCallback(() => router.push("/settings/roles"), [router]);
  const handleOpenAssignments = useCallback(() => setAssignmentsOpen(true), []);
  const handleRetry = useCallback(() => {
    void roleQuery.refetch();
  }, [roleQuery]);

  if (roleQuery.isLoading) {
    return <RoleEditorSkeleton />;
  }

  if (roleQuery.isError) {
    return (
      <PageWrapper
        title="Role"
        subtitle="This role could not be loaded."
        backHref="/settings/roles"
        backLabel="Back to Roles"
      >
        <ErrorState
          className="flex-1"
          title="Couldn't load this role"
          description={getErrorMessage(roleQuery.error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!roleQuery.data) {
    return (
      <PageWrapper
        title="Role not found"
        backHref="/settings/roles"
        backLabel="Back to Roles"
      >
        <EmptyState
          illustrationPreset="security"
          title="Role not found"
          description="This role does not exist, or you do not have access to it."
          action={{ label: "Back to Roles", onClick: handleBack }}
        />
      </PageWrapper>
    );
  }

  const role = roleQuery.data;
  const memberCount = Array.isArray(membersQuery.data)
    ? new Set(
        membersQuery.data
          .filter((member) => member.principalType === "user")
          .map((member) => member.principalId),
      ).size
    : 0;

  return (
    <PageWrapper
      title={role.name}
      subtitle="Manage permissions for this role"
      noInternalScroll
      backHref="/settings/roles"
      backLabel="Roles"
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wide font-medium">
                    Slug
                  </p>
                  <p className="text-sm font-mono font-medium">{role.slug}</p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block" />

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wide font-medium">
                    Created
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(role.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block" />

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wide font-medium">
                    Members with this role
                  </p>
                  {membersQuery.isLoading ? (
                    <Skeleton className="h-4 w-8" />
                  ) : (
                    <p className="text-sm font-medium">{memberCount}</p>
                  )}
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block" />

              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wide font-medium">
                    Scope
                  </p>
                  <p className="text-sm font-medium">
                    Organisation-wide, every module
                  </p>
                </div>
              </div>

              {role.isSystem && (
                <>
                  <Separator orientation="vertical" className="hidden sm:block" />
                  <Badge variant="outline" className="text-dense">
                    System role
                  </Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 min-h-0">
          <PermissionMatrix role={role} onOpenAssignments={handleOpenAssignments} />
        </div>
      </div>

      <RoleAssignmentsSheet
        role={role}
        open={assignmentsOpen}
        onOpenChange={setAssignmentsOpen}
      />
    </PageWrapper>
  );
}
