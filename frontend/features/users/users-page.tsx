"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useUsers, useUpdateUserStatus, useDeleteUser } from "@/lib/api/hooks/users";
import type { User } from "@/lib/api/hooks/users";
import { getApiError } from "@/lib/api-client";
import { UserStatusBadge } from "./user-status-badge";
import { UserDetailSheet } from "./user-detail-sheet";
import { UserInviteDialog } from "./user-invite-dialog";
import { UserBulkInviteDialog } from "./user-bulk-invite-dialog";
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

  const isLoading = isUpdatingStatus || isDeleting;

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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [role, setRole] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleRoleChange = useCallback((value: string) => {
    setRole(value);
    setPage(1);
  }, []);

  const { data, isLoading } = useUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status !== "all" ? (status as "active" | "suspended" | "archived") : undefined,
    role: role !== "all" ? role : undefined,
  });

  function handleRowClick(userId: string) {
    setSelectedUserId(userId);
    setSheetOpen(true);
  }

  const users = data?.data ?? [];
  const pagination = data?.pagination;

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
              onClick={() => setBulkInviteOpen(true)}
            >
              Bulk Invite
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
          <div className="flex flex-wrap items-center gap-2 w-full">
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
          </div>
        }
      >
        {isLoading ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Last Active</TableHead>
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
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Joined</TableHead>
                    <TableHead className="text-xs w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleRowClick(user.id)}
                    >
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
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
    </>
  );
}
