"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRoles, useDeleteRole, useRolesAnalytics, useRolePermissionsMatrix } from "@/hooks/api/roles";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { Loader2, Shield, ClipboardList } from "lucide-react";
import { PlusIcon, Trash2Icon, CopyIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiError } from "@/lib/api-client";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Role } from "@/types/organization";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { CreateRoleDialog } from "@/components/rbac/create-role-dialog";
import { RoleAssignmentsSheet } from "@/components/rbac/role-assignments-sheet";
import { RoleTemplateDialog } from "@/features/settings/roles/role-dialogs";

export default function RolesPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <RolesContent />
    </DashboardGate>
  );
}

function RolesContent() {
  const { data: roles, isLoading, isError: rolesError, refetch: refetchRoles } = useRoles();
  const { data: analytics, isLoading: analyticsLoading } = useRolesAnalytics();
  const matrixQuery = useRolePermissionsMatrix();
  const permCountByRoleId = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of matrixQuery.data ?? []) {
      map.set(entry.roleId, entry.permissions.length);
    }
    return map;
  }, [matrixQuery.data]);
  const deleteRole = useDeleteRole();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const selectedRole = roles?.find((role) => role.id === selectedRoleId) ?? null;

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleOpenTemplate = useCallback(() => setTemplateOpen(true), []);
  const handleOpenAssignments = useCallback(() => setAssignmentsOpen(true), []);
  const handleSelectRole = useCallback((roleId: number) => setSelectedRoleId(roleId), []);
  const handleDeleteDialogClose = useCallback(() => setDeleteTarget(null), []);
  const handleRetryRoles = useCallback(() => { void refetchRoles(); }, [refetchRoles]);

  const handleDeleteRole = useCallback(() => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (selectedRoleId === deleteTarget.id) setSelectedRoleId(null);
        setDeleteTarget(null);
        toast.success("Role deleted");
      },
      onError: (error) => toast.error(getApiError(error)),
    });
  }, [deleteRole, deleteTarget, selectedRoleId]);

  const metricsLoading = isLoading || analyticsLoading;
  const metrics = [
    { label: "Total Roles", value: analytics?.totalRoles ?? 0 },
    { label: "Custom Roles", value: analytics?.customRoles ?? 0 },
    { label: "Users Assigned", value: analytics?.usersAssigned ?? 0 },
    { label: "Total Permissions", value: analytics?.totalPermissions ?? 0 },
  ];

  return (
    <PageWrapper
      title="Roles & Permissions"
      subtitle="Configure access controls for each role"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="sm:hidden" asChild aria-label="Audit log">
            <Link href="/settings/roles/audit">
              <ClipboardList className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="hidden sm:inline-flex gap-2">
            <Link href="/settings/roles/audit">
              <ClipboardList className="h-4 w-4" /> Audit log
            </Link>
          </Button>
          <AnimatedIconButton icon={CopyIcon} iconSize={16} variant="outline" size="icon" className="sm:hidden" onClick={handleOpenTemplate} aria-label="Use template" />
          <AnimatedIconButton icon={CopyIcon} iconSize={16} iconClassName="mr-2" variant="outline" onClick={handleOpenTemplate} className="hidden sm:inline-flex">
            Use template
          </AnimatedIconButton>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-0 sm:mr-1"
            onClick={handleOpenCreate}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <span className="hidden sm:inline">New role</span>
          </AnimatedIconButton>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricsLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
        ) : (
          <>
            {metrics.map(({ label, value }) => (
              <Card key={label} className="p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold tabular-nums">{value}</p>
              </Card>
            ))}
          </>
        )}
      </div>

      <div className="grid flex-1 min-h-0 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col lg:min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> Roles ({roles?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 lg:flex-1 lg:min-h-0">
            {isLoading ? (
              <div className="divide-y divide-border/60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            ) : rolesError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
                <Shield className="h-10 w-10 text-destructive/50" />
                <div>
                  <p className="text-sm font-medium">Failed to load roles</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Something went wrong</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleRetryRoles} className="gap-1.5">
                  Retry
                </Button>
              </div>
            ) : (roles ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
                <Shield className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">No roles yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Create a role to manage permissions</p>
                </div>
                <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
                  <PlusIcon size={14} /> New role
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[45vh] lg:max-h-none lg:h-full" type="auto">
                <div className="divide-y divide-border/60">
                  {(roles ?? []).map((role) => (
                    <RoleListItem
                      key={role.id}
                      role={role}
                      isSelected={selectedRoleId === role.id}
                      onSelect={handleSelectRole}
                      onDelete={setDeleteTarget}
                      permCount={permCountByRoleId.get(role.id) ?? 0}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {selectedRole ? (
          <PermissionMatrix role={selectedRole} onOpenAssignments={handleOpenAssignments} />
        ) : (
          <Card className="flex items-center justify-center min-h-[260px] lg:min-h-0 lg:h-full">
            <div className="text-center px-6">
              <EmptyApprovalIllustration className="mx-auto mb-3 w-40 h-40" />
              <p className="text-sm font-medium text-foreground">Select a role</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a role from the list to view and edit permissions
              </p>
            </div>
          </Card>
        )}
      </div>
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RoleTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
      <RoleAssignmentsSheet
        role={selectedRole}
        open={assignmentsOpen}
        onOpenChange={setAssignmentsOpen}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>? Users with this role will
              lose their assigned permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={deleteRole.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRole.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

function DeleteRoleButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
      aria-label="Delete role"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </button>
  );
}

interface RoleListItemProps {
  role: Role;
  isSelected: boolean;
  onSelect: (roleId: number) => void;
  onDelete: (role: Role) => void;
  permCount: number;
}

function RoleListItem({ role, isSelected, onSelect, onDelete, permCount }: RoleListItemProps) {
  const handleSelect = useCallback(() => onSelect(role.id), [role.id, onSelect]);
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(role.id);
      }
    },
    [role.id, onSelect],
  );
  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDelete(role);
    },
    [role, onDelete],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between cursor-pointer",
        isSelected && "bg-muted/50 border-l-2 border-primary",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{role.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {permCount} permissions
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {role.isSystem && (
          <Badge variant="outline" className="text-[9px] px-1.5">
            System
          </Badge>
        )}
        {!role.isSystem && (
          <DeleteRoleButton onClick={handleDelete} />
        )}
      </div>
    </div>
  );
}
