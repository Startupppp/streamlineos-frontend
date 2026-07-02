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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  useUsers,
  useUpdateUserStatus,
  useDeleteUser,
  useBulkRestore,
} from "@/hooks/api/users";
import type { User } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
import { UserDetailSheet } from "./user-detail-sheet";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Archive,
  RefreshCw,
  ShieldCheck,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function RowSkeleton() {
  return (
    <TableRow className="h-8">
      <TableCell className="w-10 px-2 py-1">
        <Skeleton className="h-4 w-4 rounded" />
      </TableCell>
      <TableCell className="px-2 py-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <Skeleton className="h-3 w-28" />
        </div>
      </TableCell>
      <TableCell className="px-2 py-1"><Skeleton className="h-3 w-36" /></TableCell>
      <TableCell className="px-2 py-1"><Skeleton className="h-4 w-14 rounded-full" /></TableCell>
      <TableCell className="px-2 py-1"><Skeleton className="h-3 w-20" /></TableCell>
      <TableCell className="w-8 px-2 py-1" />
    </TableRow>
  );
}

interface ArchivedActionsMenuProps {
  user: User;
  onView: () => void;
}

function ArchivedActionsMenu({ user, onView }: ArchivedActionsMenuProps) {
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateUserStatus();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  function handleRestore() {
    updateStatus(
      { userId: user.id, status: "active" },
      {
        onSuccess: () => toast.success("User restored"),
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  function handleDelete() {
    deleteUser(user.id, {
      onSuccess: () => toast.success("User deleted"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isUpdating || isDeleting}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView}>View details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleRestore}>
          <ShieldCheck className="h-3.5 w-3.5 mr-2 text-green-600" />
          Restore
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

export function ArchivedUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = useUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: "archived",
  });

  const { mutate: bulkRestore, isPending: isRestoring } = useBulkRestore();

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    [],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) setSelectedIds(new Set(users.map((u) => u.id)));
      else setSelectedIds(new Set());
    },
    [users],
  );

  const handleSelectAllChange = useCallback(
    (c: boolean | string) => handleSelectAll(!!c),
    [handleSelectAll],
  );

  function handleRowClick(userId: string) {
    setSelectedUserId(userId);
    setSheetOpen(true);
  }

  const handleSelectRow = useCallback((userId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

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

  const handlePrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);

  const handleNextPage = useCallback(
    () => setPage((p) => Math.min(pagination?.totalPages ?? 1, p + 1)),
    [pagination?.totalPages],
  );

  const handleSheetChange = useCallback((v: boolean) => setSheetOpen(v), []);

  return (
    <>
      <PageWrapper
        title="Archived Users"
        eyebrow="People"
        subtitle="Archived members no longer have access."
        badge={pagination?.total !== undefined ? String(pagination.total) : undefined}
        filters={
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search archived users..."
              value={search}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs"
            />
          </div>
        }
      >
        {someSelected && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-muted/60 border text-xs flex-wrap">
            <span className="font-medium text-muted-foreground">{selectedIds.size} selected</span>
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleBulkRestore}
                disabled={isRestoring}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Restore
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

        {isError ? (
          <ErrorState
            title="Failed to load archived users"
            description="An error occurred while loading archived users."
            onRetry={handleRetry}
          />
        ) : isLoading ? (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 h-8">
                    <TableHead className="w-10 px-2" />
                    <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">User</TableHead>
                    <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Email</TableHead>
                    <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Role</TableHead>
                    <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Archived</TableHead>
                    <TableHead className="w-8 px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <RowSkeleton key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            illustration={<Archive className="text-muted-foreground/40" />}
            title="No archived users"
            description={
              debouncedSearch
                ? "No archived users match your search."
                : "No users have been archived yet."
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 h-8">
                      <TableHead className="w-10 px-2 pl-4">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAllChange}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">User</TableHead>
                      <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Email</TableHead>
                      <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Role</TableHead>
                      <TableHead className="px-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Archived</TableHead>
                      <TableHead className="w-8 px-2" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="h-8 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleRowClick(user.id)}
                      >
                        <TableCell className="pl-4 px-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={(c) => handleSelectRow(user.id, !!c)}
                            aria-label={`Select ${user.name ?? user.email}`}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1">
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
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px] text-muted-foreground truncate max-w-[180px]">
                          {user.email}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px] text-muted-foreground tabular-nums font-mono">
                          {formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <ArchivedActionsMenu user={user} onView={() => handleRowClick(user.id)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handlePrevPage}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2">{page} / {pagination.totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleNextPage}
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

      <UserDetailSheet userId={selectedUserId} open={sheetOpen} onOpenChange={handleSheetChange} />
    </>
  );
}
