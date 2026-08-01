"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  Loader2,
  Pencil,
  Shield,
  ClipboardList,
  ShieldCheck,
  Users,
  KeyRound,
  Layers,
  TrendingUp,
  FlaskConical,
} from "lucide-react";
import { PlusIcon, Trash2Icon, CopyIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useRoles,
  useDeleteRole,
  useRolesAnalytics,
  useRolePermissionsMatrix,
} from "@/hooks/api/roles";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Role } from "@/types/organization";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { CreateRoleDialog } from "@/components/rbac/create-role-dialog";
import { RenameRoleDialog } from "@/components/rbac/rename-role-dialog";
import { RoleAssignmentsSheet } from "@/components/rbac/role-assignments-sheet";
import { RoleTemplateDialog } from "./role-dialogs";

export function RolesPage() {
  const {
    data: roles,
    isLoading,
    isError: rolesError,
    refetch: refetchRoles,
  } = useRoles();
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
  const [renameTarget, setRenameTarget] = useState<Role | null>(null);
  const [search, setSearch] = useState("");

  const selectedRole = roles?.find((role) => role.id === selectedRoleId) ?? null;

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles ?? [];
    return (roles ?? []).filter((role) => role.name.toLowerCase().includes(q));
  }, [roles, search]);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleOpenTemplate = useCallback(() => setTemplateOpen(true), []);
  const handleOpenAssignments = useCallback(() => setAssignmentsOpen(true), []);
  const handleSelectRole = useCallback((roleId: number) => setSelectedRoleId(roleId), []);
  const handleDeleteDialogClose = useCallback(() => setDeleteTarget(null), []);
  const handleRenameDialogClose = useCallback(
    (open: boolean) => { if (!open) setRenameTarget(null); },
    [],
  );
  const handleRetryRoles = useCallback(() => { void refetchRoles(); }, [refetchRoles]);
  const handleSearchChange = useCallback((value: string) => setSearch(value), []);

  const handleDeleteRole = useCallback(() => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (selectedRoleId === deleteTarget.id) setSelectedRoleId(null);
        setDeleteTarget(null);
        toast.success("Role deleted");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteRole, deleteTarget, selectedRoleId]);

  const metricsLoading = isLoading || analyticsLoading;

  return (
    <PageWrapper
      title="Roles & Permissions"
      subtitle="Configure access controls for each role."
      noInternalScroll
      actions={
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:justify-end">
          <Button variant="outline" size="sm" asChild className="w-full gap-1.5 sm:w-auto">
            <Link href="/settings/roles/audit">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="truncate">Audit</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full gap-1.5 sm:w-auto">
            <Link href="/settings/roles/simulate">
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="truncate">Simulate</span>
            </Link>
          </Button>
          <AnimatedIconButton
            icon={CopyIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            onClick={handleOpenTemplate}
            className="w-full sm:w-auto"
          >
            <span className="truncate">Template</span>
          </AnimatedIconButton>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
            className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <span className="truncate">New role</span>
          </AnimatedIconButton>
        </div>
      }
      filters={
        <SearchInput
          placeholder="Search roles…"
          value={search}
          onValueChange={handleSearchChange}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          {metricsLoading ? (
            <StatCardGridSkeleton cols={5} count={5} />
          ) : (
            <StatCardGrid cols={5}>
              <StatCard label="Total Roles" value={analytics?.totalRoles ?? 0} icon={Layers} />
              <StatCard label="Custom Roles" value={analytics?.customRoles ?? 0} icon={ShieldCheck} tone="blue" />
              <StatCard label="Users Assigned" value={analytics?.usersAssigned ?? 0} icon={Users} tone="emerald" />
              <StatCard label="Total Permissions" value={analytics?.totalPermissions ?? 0} icon={KeyRound} tone="amber" />
              <StatCard label="Recent Changes" value={analytics?.recentChanges ?? 0} icon={TrendingUp} />
            </StatCardGrid>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:grid lg:grid-cols-[320px_1fr] lg:overflow-hidden">
          <RolesListPanel
            isLoading={isLoading}
            rolesError={rolesError}
            filteredRoles={filteredRoles}
            search={search}
            selectedRoleId={selectedRoleId}
            permCountByRoleId={permCountByRoleId}
            onRetry={handleRetryRoles}
            onCreate={handleOpenCreate}
            onSelect={handleSelectRole}
            onDelete={setDeleteTarget}
            onRename={setRenameTarget}
          />

          <div className="flex min-h-[260px] flex-1 flex-col lg:h-full lg:min-h-0">
            {selectedRole ? (
              <PermissionMatrix role={selectedRole} onOpenAssignments={handleOpenAssignments} />
            ) : (
              <Card className="flex h-full min-h-[260px] items-center justify-center overflow-hidden">
                <div className="px-6 text-center">
                  <EmptyApprovalIllustration className="mx-auto mb-3 h-40 w-40" />
                  <p className="text-sm font-medium text-foreground">Select a role</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose a role from the list to view and edit permissions
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RenameRoleDialog
        role={renameTarget}
        open={!!renameTarget}
        onOpenChange={handleRenameDialogClose}
      />
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
              <span className="font-semibold">{deleteTarget?.name}</span>? Users with this
              role will lose their assigned permissions.
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

interface RolesListPanelProps {
  isLoading: boolean;
  rolesError: boolean;
  filteredRoles: Role[];
  search: string;
  selectedRoleId: number | null;
  permCountByRoleId: Map<number, number>;
  onRetry: () => void;
  onCreate: () => void;
  onSelect: (roleId: number) => void;
  onDelete: (role: Role) => void;
  onRename: (role: Role) => void;
}

function RolesListPanel({
  isLoading,
  rolesError,
  filteredRoles,
  search,
  selectedRoleId,
  permCountByRoleId,
  onRetry,
  onCreate,
  onSelect,
  onDelete,
  onRename,
}: RolesListPanelProps) {
  let body: ReactNode;

  if (isLoading) {
    body = (
      <div className="divide-y divide-border/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        ))}
      </div>
    );
  } else if (rolesError) {
    body = (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <Shield className="h-10 w-10 text-destructive/50" />
        <div>
          <p className="text-sm font-medium">Failed to load roles</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Something went wrong</p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          Retry
        </Button>
      </div>
    );
  } else if (filteredRoles.length === 0) {
    body = (
      <EmptyState
        illustrationPreset="security"
        title={search.trim() ? "No matching roles" : "No roles yet"}
        description={
          search.trim()
            ? "Try a different search term."
            : "Create a role to manage permissions."
        }
        action={search.trim() ? undefined : { label: "New role", onClick: onCreate }}
        compact
        className="border-0 bg-transparent py-10"
      />
    );
  } else {
    body = (
      <ScrollArea className="min-h-0 flex-1" type="auto">
        <div className="divide-y divide-border/60">
          {filteredRoles.map((role) => (
            <RoleListItem
              key={role.id}
              role={role}
              isSelected={selectedRoleId === role.id}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              permCount={permCountByRoleId.get(role.id) ?? 0}
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <Card className="flex max-h-[min(420px,50dvh)] min-h-0 flex-col overflow-hidden lg:h-full lg:max-h-none">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4" /> Roles
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {body}
      </CardContent>
    </Card>
  );
}

function RenameRoleButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="Rename role"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
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
  onRename: (role: Role) => void;
  permCount: number;
}

function RoleListItem({ role, isSelected, onSelect, onDelete, onRename, permCount }: RoleListItemProps) {
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
    (event: React.MouseEvent) => { event.stopPropagation(); onDelete(role); },
    [role, onDelete],
  );
  const handleRename = useCallback(
    (event: React.MouseEvent) => { event.stopPropagation(); onRename(role); },
    [role, onRename],
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
        <p className="text-[11px] text-muted-foreground">{permCount} permissions</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {role.isSystem && (
          <Badge variant="outline" className="text-[9px] px-1.5">System</Badge>
        )}
        {!role.isSystem && (
          <>
            <RenameRoleButton onClick={handleRename} />
            <DeleteRoleButton onClick={handleDelete} />
          </>
        )}
      </div>
    </div>
  );
}
