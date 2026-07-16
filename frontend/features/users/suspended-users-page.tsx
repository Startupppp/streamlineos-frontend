"use client";

import { useState, useCallback, useMemo } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

interface SuspendedActionsMenuProps {
  user: User;
  onView: () => void;
}

function SuspendedActionsMenu({ user, onView }: SuspendedActionsMenuProps) {
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateUserStatus();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  function handleActivate() {
    updateStatus(
      { userId: user.id, status: "active" },
      {
        onSuccess: () => toast.success("User activated"),
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  function handleArchive() {
    updateStatus(
      { userId: user.id, status: "archived" },
      {
        onSuccess: () => toast.success("User archived"),
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
        <AnimatedIconButton
          icon={EllipsisIcon}
          iconSize={16}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isUpdating || isDeleting}
        >
          <span className="sr-only">Actions</span>
        </AnimatedIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView}>View details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleActivate}>
          <ShieldCheck className="h-3.5 w-3.5 mr-2 text-green-600" />
          Activate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleArchive}>
          <ShieldOff className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SuspendedUsersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
      setPage(1);
    },
    [],
  );

  const { data, isLoading, isError, refetch } = useUsers(
    {
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      status: "suspended",
    },
    { placeholderData: keepPreviousData },
  );

  const { mutate: bulkRestore, isPending: isRestoring } = useBulkRestore();

  const users = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;
  const someSelected = selectedIds.size > 0;

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  function handleRowClick(user: User) {
    setSelectedUserId(user.id);
    setSheetOpen(true);
  }

  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    setSelectedIds(new Set([...sel].map(String)));
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

  const handleSheetChange = useCallback((v: boolean) => setSheetOpen(v), []);

  const columns = useMemo<DataTableColumn<User>[]>(() => [
    {
      key: "user",
      header: "User",
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
        <span className="text-[11px] text-muted-foreground truncate max-w-[180px] block">
          {user.email}
        </span>
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
      key: "suspended",
      header: "Suspended",
      cell: (user) => (
        <span className="text-[11px] text-muted-foreground tabular-nums font-mono">
          {formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (user) => (
        <div onClick={(e) => e.stopPropagation()}>
          <SuspendedActionsMenu user={user} onView={() => { setSelectedUserId(user.id); setSheetOpen(true); }} />
        </div>
      ),
      className: "w-8",
    },
  ], []);

  return (
    <>
      <PageWrapper
        title="Suspended Users"
        subtitle="Users whose access has been temporarily suspended."
        filters={
          <div className="min-w-0 flex-1 min-w-[180px] max-w-sm">
            <SearchInput placeholder="Search suspended users..." value={search} onValueChange={handleSearchChange} />
          </div>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col space-y-3">
          {someSelected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border text-xs flex-wrap">
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
              title="Failed to load suspended users"
              description="An error occurred while loading suspended users."
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              className="flex-1 min-h-0"
            data={users}
            columns={columns}
            getRowKey={(u) => u.id}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            selection={{
              selected: selectedIds,
              onChange: handleSelectionChange,
            }}
            pagination={{
              mode: "server",
              page,
              pageSize: 20,
              total: pagination?.total ?? 0,
              onPageChange: setPage,
            }}
            emptyState={
              <EmptyState
                illustrationPreset="security"
                title="No suspended users"
                description={
                  debouncedSearch
                    ? "No suspended users match your search."
                    : "No users are currently suspended."
                }
              />
            }
          />
          )}
        </div>
      </PageWrapper>

      <UserDetailSheet userId={selectedUserId} open={sheetOpen} onOpenChange={handleSheetChange} />
    </>
  );
}
