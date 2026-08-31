"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  ShieldCheck,
  Users,
  KeyRound,
  Layers,
  TrendingUp,
  FlaskConical,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GroupsPanel } from "./groups/groups-panel";
import {
  useDeleteRole,
  usePaginatedRoles,
  useRolesAnalytics,
  type RoleListRow,
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
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCan } from "@/hooks/api/access";
import type { Role } from "@/types/organization";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { RenameRoleDialog } from "@/components/rbac/rename-role-dialog";
import { RoleAssignmentsSheet } from "@/components/rbac/role-assignments-sheet";
import { useRoleListState } from "./use-role-list-state";
import { RolesListPanel } from "./roles-list-panel";

const EMPTY_ROLE_ROWS: RoleListRow[] = [];

export function RolesPage() {
  const [activeTab, setActiveTab] = useState<"roles" | "groups">("roles");
  const canViewAudit = useCan("audit-log:read");
  const {
    page,
    limit,
    search,
    serverSearch,
    setSearch,
    setPage,
    setPageSize,
    query,
  } = useRoleListState();
  const {
    data: rolesPage,
    isLoading,
    isError: rolesError,
    error: rolesQueryError,
    refetch: refetchRoles,
  } = usePaginatedRoles(query);
  const { data: analytics, isLoading: analyticsLoading } = useRolesAnalytics();
  const deleteRole = useDeleteRole();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleListRow | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [renameTarget, setRenameTarget] = useState<Role | null>(null);
  const roles = rolesPage?.data ?? EMPTY_ROLE_ROWS;
  const pagination = rolesPage?.pagination ?? {
    page,
    limit,
    total: 0,
    totalPages: 0,
  };
  const lastPage = Math.max(1, pagination.totalPages);
  const isOutOfRange =
    rolesPage !== undefined && page > lastPage;
  const selectedRole =
    roles.find((role) => role.id === selectedRoleId) ?? null;

  const handleOpenAssignments = useCallback(() => setAssignmentsOpen(true), []);
  const handleSelectRole = useCallback((roleId: number) => setSelectedRoleId(roleId), []);
  const handleDeleteDialogClose = useCallback(() => {
    setDeleteTarget(null);
    setDeleteConfirmation("");
  }, []);
  const handleOpenDelete = useCallback((role: RoleListRow) => {
    setDeleteConfirmation("");
    setDeleteTarget(role);
  }, []);
  const handleDeleteConfirmationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmation(e.target.value),
    [],
  );
  const handleRenameDialogClose = useCallback(
    (open: boolean) => { if (!open) setRenameTarget(null); },
    [],
  );
  const handleRetryRoles = useCallback(() => { void refetchRoles(); }, [refetchRoles]);
  const handleClearSearch = useCallback(() => setSearch(""), [setSearch]);

  const handleDeleteRole = useCallback(() => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (selectedRoleId === deleteTarget.id) setSelectedRoleId(null);
        setDeleteTarget(null);
        setDeleteConfirmation("");
        toast.success("Role deleted");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteRole, deleteTarget, selectedRoleId]);

  const deleteEnabled = deleteConfirmation === (deleteTarget?.name ?? "");

  useEffect(() => {
    if (!isOutOfRange) return;
    setPage(lastPage);
  }, [isOutOfRange, lastPage, setPage]);

  useEffect(() => {
    if (selectedRoleId === null || isLoading || rolesPage === undefined) return;
    if (roles.some((role) => role.id === selectedRoleId)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRoleId(null);
  }, [isLoading, roles, rolesPage, selectedRoleId]);

  return (
    <PageWrapper
      title="Roles & Permissions"
      subtitle="Configure access controls for each role."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        activeTab === "roles" ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedIconButton
                  icon={EllipsisIcon}
                  iconSize={14}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  aria-label="More role tools"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canViewAudit && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/roles/audit">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Audit
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/settings/roles/simulate">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Simulate
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : undefined
      }
      filters={
        activeTab === "roles" ? (
          <SearchInput
            placeholder="Search roles..."
            value={search}
            onValueChange={setSearch}
            maxLength={100}
          />
        ) : undefined
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "roles" | "groups")}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <TabsList className="shrink-0">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <GroupsPanel />
        </TabsContent>

        <TabsContent value="roles" className="gap-3 overflow-hidden">
        <div className="shrink-0">
          {analyticsLoading ? (
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

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)] lg:items-stretch">
          <div className="min-h-0 max-lg:h-[min(420px,50dvh)] lg:h-full">
            <RolesListPanel
              isLoading={isLoading || isOutOfRange}
              rolesError={rolesError}
              rolesQueryError={rolesQueryError}
              roles={roles}
              search={serverSearch}
              pagination={pagination}
              selectedRoleId={selectedRoleId}
              onRetry={handleRetryRoles}
              onSelect={handleSelectRole}
              onDelete={handleOpenDelete}
              onRename={setRenameTarget}
              onClearSearch={handleClearSearch}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden max-lg:min-h-[260px] lg:h-full">
            {selectedRole ? (
              <PermissionMatrix role={selectedRole} onOpenAssignments={handleOpenAssignments} />
            ) : (
              <Card className="flex h-full min-h-0 items-center justify-center overflow-hidden">
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
        </TabsContent>
      </Tabs>

      <RenameRoleDialog
        role={renameTarget}
        open={!!renameTarget}
        onOpenChange={handleRenameDialogClose}
      />
      <RoleAssignmentsSheet
        role={selectedRole}
        open={assignmentsOpen}
        onOpenChange={setAssignmentsOpen}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>{" "}
              will permanently remove this role.{" "}
              {deleteTarget
                ? deleteTarget.memberCount === 0
                  ? "No members currently hold it."
                  : `${deleteTarget.memberCount} ${deleteTarget.memberCount === 1 ? "member" : "members"} will lose the permissions it grants.`
                : "Members assigned to it will lose the associated permissions."}{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-sm">
              Type{" "}
              <span className="font-mono font-semibold">{deleteTarget?.name}</span>{" "}
              to confirm
            </Label>
            <Input
              value={deleteConfirmation}
              onChange={handleDeleteConfirmationChange}
              placeholder={deleteTarget?.name ?? ""}
              className="font-mono"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                onClick={handleDeleteRole}
                isPending={deleteRole.isPending}
                disabled={!deleteEnabled}
                loadingText="Deleting…"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
