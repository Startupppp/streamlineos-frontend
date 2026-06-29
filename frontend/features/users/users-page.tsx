"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useUsers,
  useUpdateUserStatus,
  useDeleteUser,
  useBulkSuspend,
  useBulkArchive,
  useBulkRestore,
  useBulkUpdateUsers,
  useResetUserPassword,
  useExportUsers,
} from "@/lib/api/hooks/users";
import type { User } from "@/lib/api/hooks/users";
import { useOrgBranches, useOrgDepartments } from "@/lib/api/hooks/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { UserStatusBadge } from "./user-status-badge";
import { UserDetailSheet } from "./user-detail-sheet";
import { UserInviteDialog } from "./user-invite-dialog";
import { UserBulkInviteDialog } from "./user-bulk-invite-dialog";
import { UserStatsCards } from "./user-stats-cards";
import { UserImportDialog } from "./user-import-dialog";
import { UserCreateDialog } from "./user-create-dialog";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  UserX,
  ShieldOff,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Download,
  KeyRound,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCog,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function RowSkeleton() {
  return (
    <TableRow>
      <TableCell className="w-10"><Skeleton className="h-4 w-4 rounded" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-3.5 w-40" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-6 rounded" /></TableCell>
    </TableRow>
  );
}

interface UserActionsMenuProps {
  user: User;
  onView: () => void;
}

function UserActionsMenu({ user, onView }: UserActionsMenuProps) {
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: resetPassword, isPending: isResettingPassword } = useResetUserPassword();

  function handleActivate() {
    updateStatus(
      { userId: user.id, status: "active" },
      {
        onSuccess: () => toast.success("User activated"),
        onError: (e) => toast.error(getApiError(e)),
      }
    );
  }

  function handleSuspend() {
    updateStatus(
      { userId: user.id, status: "suspended" },
      {
        onSuccess: () => toast.success("User suspended"),
        onError: (e) => toast.error(getApiError(e)),
      }
    );
  }

  function handleArchive() {
    updateStatus(
      { userId: user.id, status: "archived" },
      {
        onSuccess: () => toast.success("User archived"),
        onError: (e) => toast.error(getApiError(e)),
      }
    );
  }

  function handleDelete() {
    deleteUser(user.id, {
      onSuccess: () => toast.success("User deleted"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleResetPassword() {
    resetPassword(user.id, {
      onSuccess: (r) => toast.success(`Password reset email sent to ${r.email}`),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  const isLoading = isUpdatingStatus || isDeleting || isResettingPassword;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isLoading}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>
          View details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!user.isActive && (
          <DropdownMenuItem onClick={handleActivate}>
            <ShieldCheck className="h-3.5 w-3.5 mr-2 text-green-600" />
            Activate
          </DropdownMenuItem>
        )}
        {user.isActive && (
          <DropdownMenuItem onClick={handleSuspend}>
            <ShieldOff className="h-3.5 w-3.5 mr-2 text-yellow-600" />
            Suspend
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleArchive}>
          <UserX className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetPassword}>
          <KeyRound className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [role, setRole] = useState(searchParams.get("role") ?? "all");
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") ?? "all");
  const [branchId, setBranchId] = useState(searchParams.get("branchId") ?? "all");
  const [sortBy, setSortBy] = useState<"name" | "joinedAt" | "status">(
    (searchParams.get("sortBy") as "name" | "joinedAt" | "status") ?? "joinedAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc"
  );
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignRole, setAssignRole] = useState("all");
  const [assignBranchId, setAssignBranchId] = useState("all");
  const [assignDeptId, setAssignDeptId] = useState("all");
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const pushParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v && v !== "all" && v !== "1") params.set(k, v);
      else params.delete(k);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      pushParams({ search, page: "1" });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
    pushParams({ status: value, page: "1" });
  }, [pushParams]);

  const handleRoleChange = useCallback((value: string) => {
    setRole(value);
    setPage(1);
    pushParams({ role: value, page: "1" });
  }, [pushParams]);

  const handleDeptChange = useCallback((value: string) => {
    setDepartmentId(value);
    setPage(1);
    pushParams({ departmentId: value, page: "1" });
  }, [pushParams]);

  const handleBranchChange = useCallback((value: string) => {
    setBranchId(value);
    setPage(1);
    pushParams({ branchId: value, page: "1" });
  }, [pushParams]);

  const { data, isLoading } = useUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status !== "all" ? (status as "active" | "suspended" | "archived") : undefined,
    role: role !== "all" ? role : undefined,
    departmentId: departmentId !== "all" ? Number(departmentId) : undefined,
    branchId: branchId !== "all" ? Number(branchId) : undefined,
    sortBy,
    sortOrder,
  });

  const { data: branchesData } = useOrgBranches();
  const { data: departmentsData } = useOrgDepartments();
  const { mutate: exportUsers, isPending: isExporting } = useExportUsers();

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

  const { mutate: bulkSuspend, isPending: isSuspending } = useBulkSuspend();
  const { mutate: bulkArchive, isPending: isArchiving } = useBulkArchive();
  const { mutate: bulkRestore, isPending: isRestoring } = useBulkRestore();
  const { mutate: bulkUpdate, isPending: isBulkUpdating } = useBulkUpdateUsers();

  function handleRowClick(userId: string) {
    setSelectedUserId(userId);
    setSheetOpen(true);
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(users.map((u) => u.id)));
    } else {
      setSelectedIds(new Set());
      setSelectAllMatching(false);
    }
  }

  function handleSelectRow(userId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
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
      }
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
      }
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
      }
    );
  }

  function handleBulkAssign() {
    const payload: Parameters<typeof bulkUpdate>[0] = {
      userIds: Array.from(selectedIds),
      ...(assignRole !== "all" ? { role: assignRole } : {}),
      ...(assignBranchId !== "all" ? { branchId: Number(assignBranchId) } : {}),
      ...(assignDeptId !== "all" ? { departmentId: Number(assignDeptId) } : {}),
    };
    bulkUpdate(payload, {
      onSuccess: () => {
        toast.success(`${selectedIds.size} user(s) updated`);
        setSelectedIds(new Set());
        setAssignOpen(false);
        setAssignRole("all");
        setAssignBranchId("all");
        setAssignDeptId("all");
      },
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;
  const bulkIsPending = isSuspending || isArchiving || isRestoring || isBulkUpdating;

  function handleSort(column: "name" | "joinedAt" | "status") {
    const newOrder = sortBy === column ? (sortOrder === "asc" ? "desc" : "asc") : "asc";
    const newBy = column;
    setSortBy(newBy);
    setSortOrder(newOrder);
    setPage(1);
    pushParams({ sortBy: newBy, sortOrder: newOrder, page: "1" });
  }

  return (
    <>
      <PageWrapper
        title="Users"
        subtitle="Manage organization members, their access and preferences."
        badge={pagination?.total !== undefined ? String(pagination.total) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => exportUsers()}
              disabled={isExporting}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setBulkInviteOpen(true)}
            >
              Bulk Invite
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Create User
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Invite User
            </Button>
          </div>
        }
        filters={
          <div className="flex flex-col gap-3 w-full">
            <UserStatsCards />
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Status" />
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
                  <SelectValue placeholder="Role" />
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
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {(departmentsData?.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={branchId} onValueChange={handleBranchChange}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {(branchesData?.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        {someSelected && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-muted/60 border text-xs">
            <span className="font-medium text-muted-foreground">{selectedIds.size} selected</span>
            <div className="flex items-center gap-1.5 ml-auto">
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
                onClick={() => setAssignOpen(true)}
                disabled={bulkIsPending}
              >
                <UserCog className="h-3 w-3 mr-1" />
                Assign
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setSelectedIds(new Set()); setSelectAllMatching(false); }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {allSelected && !selectAllMatching && pagination && pagination.total > users.length && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300">
            <span>All {users.length} users on this page are selected.</span>
            <button
              type="button"
              className="font-medium underline hover:no-underline ml-1"
              onClick={() => setSelectAllMatching(true)}
            >
              Select all {pagination.total} matching users
            </button>
            {selectAllMatching && (
              <button
                type="button"
                className="ml-2 font-medium underline hover:no-underline"
                onClick={() => setSelectAllMatching(false)}
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10" />
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Branch</TableHead>
                  <TableHead className="text-xs">Dept</TableHead>
                  <TableHead className="text-xs">Joined</TableHead>
                  <TableHead className="text-xs w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            illustration={<Users className="text-muted-foreground/40" />}
            title="No users found"
            description={
              debouncedSearch || status !== "all" || role !== "all"
                ? "Try adjusting your search or filters."
                : "Invite your first team member to get started."
            }
            action={
              !debouncedSearch && status === "all" && role === "all"
                ? { label: "Invite User", onClick: () => setInviteOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(c) => handleSelectAll(!!c)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead
                      className="text-xs cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort("name")}
                    >
                      <span className="flex items-center gap-1">
                        User
                        {sortBy === "name" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead
                      className="text-xs cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort("status")}
                    >
                      <span className="flex items-center gap-1">
                        Status
                        {sortBy === "status" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </TableHead>
                    <TableHead className="text-xs">Branch</TableHead>
                    <TableHead className="text-xs">Dept</TableHead>
                    <TableHead
                      className="text-xs cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort("joinedAt")}
                    >
                      <span className="flex items-center gap-1">
                        Joined
                        {sortBy === "joinedAt" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </TableHead>
                    <TableHead className="text-xs w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleRowClick(user.id)}
                      data-state={selectedIds.has(user.id) ? "selected" : undefined}
                    >
                      <TableCell
                        className="pl-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.has(user.id)}
                          onCheckedChange={(c) => handleSelectRow(user.id, !!c)}
                          aria-label={`Select ${user.name ?? user.email}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage
                              src={user.image ?? undefined}
                              alt={user.name ?? user.email}
                            />
                            <AvatarFallback className="text-xs font-semibold">
                              {getInitials(user.name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate leading-tight">
                              {user.name ?? "—"}
                            </p>
                            {user.designation && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {user.designation}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <UserStatusBadge isActive={user.isActive} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.branchId != null ? (branchMap.get(user.branchId) ?? String(user.branchId)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.departmentId != null ? (deptMap.get(user.departmentId) ?? String(user.departmentId)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.joinedAt
                          ? formatDistanceToNow(new Date(user.joinedAt), { addSuffix: true })
                          : formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UserActionsMenu
                          user={user}
                          onView={() => handleRowClick(user.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of{" "}
                  {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); pushParams({ page: String(Math.max(1, page - 1)) }); }}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2">
                    {page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { setPage((p) => Math.min(pagination.totalPages, p + 1)); pushParams({ page: String(Math.min(pagination.totalPages, page + 1)) }); }}
                    disabled={page === pagination.totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageWrapper>

      <UserDetailSheet
        userId={selectedUserId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <UserInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <UserBulkInviteDialog open={bulkInviteOpen} onOpenChange={setBulkInviteOpen} />
      <UserImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <UserCreateDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => setCreateOpen(false)} />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Bulk Assign — {selectedIds.size} user(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Role</p>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Keep unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Keep unchanged</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Branch</p>
              <Select value={assignBranchId} onValueChange={setAssignBranchId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Keep unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Keep unchanged</SelectItem>
                  {(branchesData?.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Department</p>
              <Select value={assignDeptId} onValueChange={setAssignDeptId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Keep unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Keep unchanged</SelectItem>
                  {(departmentsData?.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleBulkAssign}
              disabled={isBulkUpdating || (assignRole === "all" && assignBranchId === "all" && assignDeptId === "all")}
            >
              {isBulkUpdating ? "Applying..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
