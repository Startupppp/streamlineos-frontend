"use client";

import { LoadingButton } from "@/components/ui/loading-button";
import { useState, useCallback, useMemo, useTransition, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useUsers,
  useExportUsers,
  useBulkSuspend,
  useBulkArchive,
  useBulkRestore,
} from "@/hooks/api/users";
import type { User } from "@/hooks/api/users";
import { useOrgBranches, useOrgDepartments } from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { UserStatusBadge } from "./user-status-badge";
import { UserDetailSheet } from "./user-detail-sheet";
import { UserInviteDialog } from "./user-invite-dialog";
import { UserBulkInviteDialog } from "./user-bulk-invite-dialog";
import { UserImportDialog } from "./user-import-dialog";
import { UserActionsMenu } from "./user-actions-menu";
import { UserBulkAssignDialog } from "./user-bulk-assign-dialog";
import { UserStatsCards } from "./user-stats-cards";
import { toast } from "sonner";
import { Users,
  ShieldOff,
  UserX,
  RefreshCw,
  UserCog,
  UserPlus,
  Download,
  Upload,
  SlidersHorizontal,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { formatDistanceToNow } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getUserDisplayName, getUserInitials } from "@/features/build/shared/resolve-user-name";
import { useCan } from "@/hooks/api/access";
import { USER_STRUCTURAL_ROLES, formatRoleLabel } from "@/features/users/user-invite-roles";

type BulkAction = "suspend" | "archive";

function assertNever(value: never): never {
  throw new Error(`Unhandled bulk action: ${String(value)}`);
}

function getBulkActionCopy(action: BulkAction, count: number) {
  const subject = `${count} user${count === 1 ? "" : "s"}`;
  switch (action) {
    case "suspend":
      return {
        title: `Suspend ${subject}?`,
        description: `${subject} will lose access immediately. Their data and membership are retained and they can be reactivated at any time. Organization owners and module owners in the selection will be skipped.`,
        confirmLabel: "Suspend",
      };
    case "archive":
      return {
        title: `Archive ${subject}?`,
        description: `${subject} will be archived and lose access. Their data and membership are retained and they can be restored at any time. Organization owners and module owners in the selection will be skipped.`,
        confirmLabel: "Archive",
      };
    default:
      return assertNever(action);
  }
}

export function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const role = searchParams.get("role") ?? "all";
  const departmentId = searchParams.get("departmentId") ?? "all";
  const branchId = searchParams.get("branchId") ?? "all";
  const sortBy = (searchParams.get("sortBy") as "name" | "joinedAt" | "status") ?? "joinedAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";
  const page = Number(searchParams.get("page") ?? "1");

  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "all" || v === "1") params.delete(k);
        else params.set(k, v);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    if (debouncedSearch === (q || "")) return;
    pushParams({ search: debouncedSearch || null, page: null });
  }, [debouncedSearch, q, pushParams]);

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    [],
  );

  const handleStatusChange = useCallback(
    (value: string) => pushParams({ status: value, page: null }),
    [pushParams],
  );

  const handleRoleChange = useCallback(
    (value: string) => pushParams({ role: value, page: null }),
    [pushParams],
  );

  const handleDeptChange = useCallback(
    (value: string) => pushParams({ departmentId: value, page: null }),
    [pushParams],
  );

  const handleBranchChange = useCallback(
    (value: string) => pushParams({ branchId: value, page: null }),
    [pushParams],
  );

  const handleSortChange = useCallback(
    (field: string, direction: "asc" | "desc") => {
      pushParams({ sortBy: field, sortOrder: direction, page: null });
    },
    [pushParams],
  );

  const { data, isLoading, isError, refetch } = useUsers(
    {
      page,
      limit: 20,
      search: q || undefined,
      status:
        status !== "all"
          ? (status as "active" | "suspended" | "archived")
          : undefined,
      role: role !== "all" ? role : undefined,
      departmentId: departmentId !== "all" ? departmentId : undefined,
      branchId: branchId !== "all" ? branchId : undefined,
      sortBy,
      sortOrder,
    },
    { placeholderData: keepPreviousData },
  );

  const { data: branchesData } = useOrgBranches();
  const { data: departmentsData } = useOrgDepartments();
  const { mutate: exportUsers, isPending: isExporting } = useExportUsers();
  const { mutate: bulkSuspend, isPending: isSuspending } = useBulkSuspend();
  const { mutate: bulkArchive, isPending: isArchiving } = useBulkArchive();
  const { mutate: bulkRestore, isPending: isRestoring } = useBulkRestore();
  const [pendingBulkAction, setPendingBulkAction] = useState<BulkAction | null>(null);
  const canCreate = useCan("settings:organization:manage");
  const canManage = useCan("settings:organization:manage");
  const canExport = useCan("settings:organization:manage");

  const branchMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branchesData?.data ?? []) m.set(String(b.id), b.name);
    return m;
  }, [branchesData]);

  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departmentsData?.data ?? []) m.set(String(d.id), d.name);
    return m;
  }, [departmentsData]);

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const selectableUsers = useMemo(() => users.filter((u) => !u.isOwner), [users]);
  const ownerCount = users.length - selectableUsers.length;
  const someSelected = selectedIds.size > 0;
  const allSelected =
    selectableUsers.length > 0 && selectableUsers.every((u) => selectedIds.has(u.id));
  const bulkIsPending = isSuspending || isArchiving || isRestoring;

  function handleRowClick(user: User) {
    setSelectedUserId(user.id);
    setSheetOpen(true);
  }

  function handleRequestBulkSuspend() {
    setPendingBulkAction("suspend");
  }

  function handleRequestBulkArchive() {
    setPendingBulkAction("archive");
  }

  function handleBulkDialogOpenChange(open: boolean) {
    if (!open) setPendingBulkAction(null);
  }

  function handleConfirmBulkAction() {
    if (pendingBulkAction === "suspend") handleBulkSuspend();
    else if (pendingBulkAction === "archive") handleBulkArchive();
    setPendingBulkAction(null);
  }

  function handleBulkSuspend() {
    bulkSuspend(
      { userIds: Array.from(selectedIds) },
      {
        onSuccess: (r) => {
          if (r.failed > 0 && r.succeeded === 0) 
            toast.error(`Failed to suspend ${r.failed} user(s)`);
          else if (r.failed > 0) 
            toast.warning(`${r.succeeded} user(s) suspended; ${r.failed} could not be updated`);
          else 
            toast.success(`${r.succeeded} user(s) suspended`);
          
          setSelectedIds(new Set());
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleBulkArchive() {
    bulkArchive(
      { userIds: Array.from(selectedIds) },
      {
        onSuccess: (r) => {
          if (r.failed > 0 && r.succeeded === 0) {
            toast.error(`Failed to archive ${r.failed} user(s)`);
          } else if (r.failed > 0) {
            toast.warning(`${r.succeeded} user(s) archived; ${r.failed} could not be updated`);
          } else {
            toast.success(`${r.succeeded} user(s) archived`);
          }
          setSelectedIds(new Set());
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleBulkRestore() {
    bulkRestore(
      { userIds: Array.from(selectedIds) },
      {
        onSuccess: (r) => {
          if (r.failed > 0 && r.succeeded === 0) {
            toast.error(`Failed to restore ${r.failed} user(s)`);
          } else if (r.failed > 0) {
            toast.warning(`${r.succeeded} user(s) restored; ${r.failed} could not be updated`);
          } else {
            toast.success(`${r.succeeded} user(s) restored`);
          }
          setSelectedIds(new Set());
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const handleSelectionChange = useCallback(
    (sel: Set<string | number>) => setSelectedIds(new Set([...sel].map(String))),
    [],
  );

  const handleOpenInvite = useCallback(() => setInviteOpen(true), []);
  const handleInviteChange = useCallback((v: boolean) => setInviteOpen(v), []);
  const handleBulkInviteChange = useCallback((v: boolean) => setBulkInviteOpen(v), []);
  const handleImportChange = useCallback((v: boolean) => setImportOpen(v), []);
  const handleSheetChange = useCallback((v: boolean) => setSheetOpen(v), []);
  const handleAssignChange = useCallback((v: boolean) => setAssignOpen(v), []);
  const handleOpenBulkInvite = useCallback(() => setBulkInviteOpen(true), []);
  const handleOpenImport = useCallback(() => setImportOpen(true), []);
  const handleExport = useCallback(() => exportUsers(), [exportUsers]);
  const handleOpenAssign = useCallback(() => setAssignOpen(true), []);
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }, []);
  const handleSelectAllMatching = useCallback(() => setSelectAllMatching(true), []);
  const handleClearAllMatching = useCallback(() => setSelectAllMatching(false), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAssignSuccess = useCallback(() => setSelectedIds(new Set()), []);
  const handlePageChange = useCallback(
    (p: number) => pushParams({ page: p === 1 ? null : String(p) }),
    [pushParams],
  );

  const columns = useMemo<DataTableColumn<User>[]>(() => [
    {
      key: "name",
      header: "User",
      sortable: true,
      cell: (user) => {
        const displayName = getUserDisplayName(user);
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={user.image ?? undefined} alt={displayName} />
              <AvatarFallback className="text-[10px] font-semibold">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <TruncatedText text={displayName} className="text-[11px] font-medium leading-tight" />
              {user.designation && (
                <TruncatedText text={user.designation} className="text-[10px] text-muted-foreground" />
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      cell: (user) => (
        <TruncatedText text={user.email} className="text-muted-foreground max-w-[180px]" />
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (user) => (
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
          {formatRoleLabel(user.role)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (user) => <UserStatusBadge isActive={user.isActive} />,
    },
    {
      key: "branch",
      header: "Branch",
      cell: (user) => (
        <span className="text-muted-foreground">
          {user.branchId != null ? (branchMap.get(String(user.branchId)) ?? String(user.branchId)) : "—"}
        </span>
      ),
    },
    {
      key: "dept",
      header: "Dept",
      cell: (user) => (
        <span className="text-muted-foreground">
          {user.departmentId != null
            ? (deptMap.get(String(user.departmentId)) ?? String(user.departmentId))
            : "—"}
        </span>
      ),
    },
    {
      key: "joinedAt",
      header: "Joined",
      sortable: true,
      className: "tabular-nums font-mono",
      cell: (user) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(user.joinedAt ?? user.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-8",
      cell: (user) => (
        <div onClick={(e) => e.stopPropagation()}>
          <UserActionsMenu
            user={user}
            onView={() => {
              setSelectedUserId(user.id);
              setSheetOpen(true);
            }}
          />
        </div>
      ),
    },
  ], [branchMap, deptMap]);

  const emptyStateNode = (
    <EmptyState
      illustrationPreset="team"
      title="No users found"
      description={
        q || status !== "all" || role !== "all"
          ? "Try adjusting your search or filters."
          : "Invite your first team member to get started."
      }
      action={
        !q && status === "all" && role === "all" && canCreate
          ? { label: "Invite User", onClick: handleOpenInvite }
          : undefined
      }
    />
  );

  function renderFilterSelects(variant: "popover" | "toolbar" = "popover") {
    const isToolbar = variant === "toolbar";
    const selectTriggerClass = isToolbar
      ? `h-9 w-0 min-w-0 flex-1 basis-0 ${FILTER_SELECT_TRIGGER}`
      : `h-9 w-full ${FILTER_SELECT_TRIGGER}`;
    return (
      <div
        className={
          isToolbar
            ? "hidden min-w-0 flex-[2] basis-0 items-center gap-2 lg:flex"
            : "flex w-full flex-col gap-2"
        }
      >
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={handleRoleChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All roles</SelectItem>
            {USER_STRUCTURAL_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentId} onValueChange={handleDeptChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All departments</SelectItem>
            {(departmentsData?.data ?? []).map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchId} onValueChange={handleBranchChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All branches</SelectItem>
            {(branchesData?.data ?? []).map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <>
      <PageWrapper
        title="Users"
        subtitle="Manage members, roles, and access."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:justify-end">
            {(canExport || canCreate) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AnimatedIconButton
                    icon={EllipsisIcon}
                    iconClassName="mr-1.5"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    More
                  </AnimatedIconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canExport && (
                    <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                  )}
                  {canCreate && (
                    <DropdownMenuItem onClick={handleOpenImport}>
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      Import CSV
                    </DropdownMenuItem>
                  )}
                  {canCreate && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleOpenBulkInvite}>
                        <Users className="h-3.5 w-3.5 mr-2" />
                        Bulk Invite
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canCreate && (
              <Button size="sm" className="w-full sm:w-auto" onClick={handleOpenInvite}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Invite User
              </Button>
            )}
          </div>
        }
        filters={
          <div className="flex w-full min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 basis-0">
              <SearchInput
                placeholder="Search users..."
                value={search}
                onValueChange={handleSearchChange}
              />
            </div>
            <ResponsivePopover>
              <ResponsivePopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 text-xs lg:hidden"
                  aria-label="Filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                </Button>
              </ResponsivePopoverTrigger>
              <ResponsivePopoverContent
                title="Filters"
                className="w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-3"
                align="end"
              >
                {renderFilterSelects()}
              </ResponsivePopoverContent>
            </ResponsivePopover>
            {renderFilterSelects("toolbar")}
          </div>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <UserStatsCards />

          {someSelected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border text-xs flex-wrap">
              <span className="font-medium text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                {canManage && (
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleRequestBulkSuspend}
                    isPending={isSuspending}
                    disabled={bulkIsPending}
                  >
                    <ShieldOff className="h-3 w-3 mr-1" />
                    Suspend
                  </LoadingButton>
                )}
                {canManage && (
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleRequestBulkArchive}
                    isPending={isArchiving}
                    disabled={bulkIsPending}
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    Archive
                  </LoadingButton>
                )}
                {canManage && (
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleBulkRestore}
                    isPending={isRestoring}
                    disabled={bulkIsPending}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Restore
                  </LoadingButton>
                )}
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleOpenAssign}
                    disabled={bulkIsPending}
                  >
                    <UserCog className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {allSelected && !selectAllMatching && pagination && pagination.total - ownerCount > selectableUsers.length && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground flex-wrap">
              <span>All {selectableUsers.length} users on this page are selected.</span>
              <button
                type="button"
                className="font-medium underline hover:no-underline ml-1"
                onClick={handleSelectAllMatching}
              >
                Select all {pagination.total - ownerCount} matching users
              </button>
            </div>
          )}

          {selectAllMatching && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground flex-wrap">
              <span>All {pagination ? pagination.total - ownerCount : 0} matching users are selected.</span>
              <button
                type="button"
                className="font-medium underline hover:no-underline ml-2"
                onClick={handleClearAllMatching}
              >
                Clear selection
              </button>
            </div>
          )}

          {isError ? (
            <ErrorState
              title="Failed to load users"
              description="An error occurred while loading users."
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              className="flex-1 min-h-0"
              data={users}
              columns={columns}
              getRowKey={(user) => user.id}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              emptyState={emptyStateNode}
              selection={{
                selected: selectedIds,
                onChange: handleSelectionChange,
                isRowSelectable: (user) => !user.isOwner,
              }}
              sortState={{
                field: sortBy,
                direction: sortOrder,
                onChange: handleSortChange,
              }}
              pagination={{
                mode: "server",
                page,
                pageSize: 20,
                total: pagination?.total ?? 0,
                onPageChange: handlePageChange,
              }}
            />
          )}
        </div>
      </PageWrapper>

      <UserDetailSheet
        userId={selectedUserId}
        open={sheetOpen}
        onOpenChange={handleSheetChange}
      />
      <UserInviteDialog open={inviteOpen} onOpenChange={handleInviteChange} />
      <UserBulkInviteDialog
        open={bulkInviteOpen}
        onOpenChange={handleBulkInviteChange}
      />
      <UserImportDialog open={importOpen} onOpenChange={handleImportChange} />
      <UserBulkAssignDialog
        open={assignOpen}
        onOpenChange={handleAssignChange}
        selectedIds={selectedIds}
        onSuccess={handleAssignSuccess}
      />
      {pendingBulkAction !== null && (
        <ConfirmDialog
          open
          onOpenChange={handleBulkDialogOpenChange}
          title={getBulkActionCopy(pendingBulkAction, selectedIds.size).title}
          description={
            getBulkActionCopy(pendingBulkAction, selectedIds.size).description
          }
          confirmLabel={
            getBulkActionCopy(pendingBulkAction, selectedIds.size).confirmLabel
          }
          isPending={pendingBulkAction === "suspend" ? isSuspending : isArchiving}
          onConfirm={handleConfirmBulkAction}
        />
      )}
    </>
  );
}
