"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Shield,
  Calendar,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { RoleAssignmentsSheet } from "@/components/rbac/role-assignments-sheet";
import { useRole, useRoleMembers } from "@/lib/api/hooks/roles";

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

  if (roleQuery.isLoading) {
    return <RoleEditorSkeleton onBack={handleBack} />;
  }

  if (roleQuery.isError || !roleQuery.data) {
    return (
      <PageWrapper title="Role not found" subtitle="This role could not be loaded.">
        <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Role not found</p>
            <p className="text-xs text-muted-foreground mt-1">
              The role you are looking for does not exist or you do not have access.
            </p>
          </div>
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Roles
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const role = roleQuery.data;
  const memberCount = membersQuery.data?.length ?? 0;

  return (
    <PageWrapper
      title={role.name}
      subtitle="Manage permissions for this role"
      noInternalScroll
      actions={
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Roles
        </Button>
      }
    >
      <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
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

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

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

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    Members
                  </p>
                  {membersQuery.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-sm font-medium">{memberCount}</p>
                  )}
                </div>
              </div>

              {role.isSystem && (
                <>
                  <Separator orientation="vertical" className="h-8 hidden sm:block" />
                  <Badge variant="outline" className="text-[11px]">
                    System role
                  </Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:flex-1 lg:min-h-0">
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

interface RoleEditorSkeletonProps {
  onBack: () => void;
}

function RoleEditorSkeleton({ onBack }: RoleEditorSkeletonProps) {
  return (
    <PageWrapper
      title="Loading…"
      subtitle="Manage permissions for this role"
      noInternalScroll
      actions={
        <Button variant="outline" onClick={onBack} className="gap-2" disabled>
          <ArrowLeft className="h-4 w-4" />
          Roles
        </Button>
      }
    >
      <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="space-y-1.5">
                <div className="h-2.5 w-8 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </div>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              </div>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-14 rounded bg-muted animate-pulse" />
                <div className="h-4 w-6 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:flex-1 lg:min-h-0 flex flex-col">
          <div className="p-4 pb-3 flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-48 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 rounded bg-muted animate-pulse" />
            </div>
          </div>
          <Separator />
          <div className="divide-y divide-border/30">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-4 w-10 rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
