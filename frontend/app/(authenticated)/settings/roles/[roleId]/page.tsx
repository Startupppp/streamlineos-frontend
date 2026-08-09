"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Shield,
  Calendar,
  Users,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RoleEditorSkeleton } from "@/features/settings/roles/role-editor-skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { RoleAssignmentsSheet } from "@/components/rbac/role-assignments-sheet";
import { useRole, useRoleMembers } from "@/hooks/api/roles";

export default function RoleEditorPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <RoleEditorContent />
    </DashboardGate>
  );
}

function RoleEditorContent() {
  const params = useParams();
  const router = useRouter();
  const roleId = Number(params.roleId);

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

  if (roleQuery.isError || !roleQuery.data) {
    return (
      <PageWrapper
        title="Role not found"
        subtitle="This role could not be loaded."
        backHref="/settings/roles"
        backLabel="Back to Roles"
      >
        <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Role not found</p>
            <p className="text-xs text-muted-foreground mt-1">
              The role you are looking for does not exist or you do not have access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={handleBack} className="gap-2">
              Back to Roles
            </Button>
          </div>
        </div>
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    Slug
                  </p>
                  <p className="text-sm font-mono font-medium">{role.slug}</p>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block" />

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    Members
                  </p>
                  {membersQuery.isLoading ? (
                    <Skeleton className="h-4 w-8" />
                  ) : (
                    <p className="text-sm font-medium">{memberCount}</p>
                  )}
                </div>
              </div>

              {role.isSystem && (
                <>
                  <Separator orientation="vertical" className="hidden sm:block" />
                  <Badge variant="outline" className="text-[11px]">
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
