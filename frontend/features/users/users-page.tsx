"use client";

import { useState, useCallback, useMemo, useTransition, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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
import { getApiError } from "@/lib/api-client";
import { UserStatusBadge } from "./user-status-badge";
import { UserDetailSheet } from "./user-detail-sheet";
import { UserInviteDialog } from "./user-invite-dialog";
import { UserBulkInviteDialog } from "./user-bulk-invite-dialog";
import { UserImportDialog } from "./user-import-dialog";
import { UserCreateDialog } from "./user-create-dialog";
import { UserActionsMenu } from "./user-actions-menu";
import { UserBulkAssignDialog } from "./user-bulk-assign-dialog";
import { UserStatsCards } from "./user-stats-cards";
import { toast } from "sonner";
import {
  Search,
  Users,
  ShieldOff,
  UserX,
  RefreshCw,
  UserCog,
  UserPlus,
  MoreHorizontal,
  Download,
  Upload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
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
  const [createOpen, setCreateOpen] = useState(false);
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
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
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
      departmentId: departmentId !== "all" ? Number(departmentId) : undefined,
      branchId: branchId !== "all" ? Number(branchId) : undefined,
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

  const branchMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branchesData?.data ?? []) m.set(Number(b.id), b.name);
    return m;
  }, [branchesData]);

  const deptMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of departmentsData?.data ?? []) m.set(Number(d.id), d.name);
    return m;
  }, [departmentsData]);

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const someSelected = selectedIds.size > 0;
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const bulkIsPending = isSuspending || isArchiving || isRestoring;

  function handleRowClick(user: User) {
    setSelectedUserId(user.id);
    setSheetOpen(true);
  }

  function handleBulkSuspend() {
    bulkSuspend(
      { userIds: Array.from(selectedIds) },
      {
        onSuccess: (r) => {
          toast.success(`${r.succeeded} user(s) suspended`);
          setSelectedIds(new Set());
        },
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  function handleBulkArchive() {
    bulkArchive(
      { userIds: Array.from(selectedIds) },
      {
        onSuccess: (r) => {
          toast.success(`${r.succeeded} user(s) archived`);
          setSelectedIds(new Set());
        },
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  function handleBulkRestore() {
    bulkRestore(
      { userIds: Array.from(selectedIds) },
      {
        onSuccess: (r) => {
          toast.success(`${r.succeeded} user(s) restored`);
          setSelectedIds(new Set());
        },
        onError: (e) => toast.error(getApiError(e)),
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
  const handleCreateChange = useCallback((v: boolean) => setCreateOpen(v), []);
  const handleSheetChange = useCallback((v: boolean) => setSheetOpen(v), []);
  const handleAssignChange = useCallback((v: boolean) => setAssignOpen(v), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
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
      cell: (user) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
            <AvatarFallback className="text-[10px] font-semibold">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate leading-tight">{user.name ?? "—"}</p>
            {user.designation && (
              <p className="text-[10px] text-muted-foreground truncate">{user.designation}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (user) => (
        <span className="text-muted-foreground truncate max-w-[180px] block">{user.email}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (user) => (
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
          {user.role}
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
          {user.branchId != null ? (branchMap.get(user.branchId) ?? String(user.branchId)) : "—"}
        </span>
      ),
    },
    {
      key: "dept",
      header: "Dept",
      cell: (user) => (
        <span className="text-muted-foreground">
          {user.departmentId != null
            ? (deptMap.get(user.departmentId) ?? String(user.departmentId))
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
        !q && status === "all" && role === "all"
          ? { label: "Invite User", onClick: handleOpenInvite }
          : undefined
      }
    />
  );

  return (
    <>
      <PageWrapper
        title="Users"
        eyebrow="People"
        subtitle="Manage members, roles, and access."
        badge={
          pagination?.total !== undefined ? String(pagination.total) : undefined
        }
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <MoreHorizontal className="h-3.5 w-3.5 mr-1.5" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenImport}>
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  Import CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenBulkInvite}>
                  <Users className="h-3.5 w-3.5 mr-2" />
                  Bulk Invite
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenCreate}>
                  <UserPlus className="h-3.5 w-3.5 mr-2" />
                  Create User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="h-8 text-xs" onClick={handleOpenInvite}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Invite User
            </Button>
          </>
        }
        filters={
          <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={handleSearchChange}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentId} onValueChange={handleDeptChange}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(departmentsData?.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchId} onValueChange={handleBranchChange}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {(branchesData?.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="space-y-3">
          <UserStatsCards />

          {someSelected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border text-xs flex-wrap">
              <span className="font-medium text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleBulkSuspend}
                  disabled={bulkIsPending}
                >
                  <ShieldOff className="h-3 w-3 mr-1" />
                  Suspend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleBulkArchive}
                  disabled={bulkIsPending}
                >
                  <UserX className="h-3 w-3 mr-1" />
                  Archive
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleBulkRestore}
                  disabled={bulkIsPending}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Restore
                </Button>
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

          {allSelected && !selectAllMatching && pagination && pagination.total > users.length && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300 flex-wrap">
              <span>All {users.length} users on this page are selected.</span>
              <button
                type="button"
                className="font-medium underline hover:no-underline ml-1"
                onClick={handleSelectAllMatching}
              >
                Select all {pagination.total} matching users
              </button>
            </div>
          )}

          {selectAllMatching && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700 flex-wrap">
              <span>All {pagination?.total} matching users are selected.</span>
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
              data={users}
              columns={columns}
              getRowKey={(user) => user.id}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              emptyState={emptyStateNode}
              selection={{
                selected: selectedIds,
                onChange: handleSelectionChange,
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
      <UserCreateDialog
        open={createOpen}
        onOpenChange={handleCreateChange}
        onSuccess={handleCloseCreate}
      />
      <UserBulkAssignDialog
        open={assignOpen}
        onOpenChange={handleAssignChange}
        selectedIds={selectedIds}
        onSuccess={handleAssignSuccess}
      />
    </>
  );
}
