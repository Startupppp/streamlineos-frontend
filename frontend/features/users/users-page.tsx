"use client";

import { useState, useCallback, useMemo, useTransition, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/ui/data-table";
import {
  useUsers,
  useExportUsers,
} from "@/hooks/api/users";
import type { User } from "@/hooks/api/users";
import { useOrgBranches, useOrgDepartments } from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { UserDetailSheet } from "./user-detail-sheet";
import { UserInviteDialog } from "./user-invite-dialog";
import { UserBulkInviteDialog } from "./user-bulk-invite-dialog";
import { UserImportDialog } from "./user-import-dialog";
import { UserBulkAssignDialog } from "./user-bulk-assign-dialog";
import { UserStatsCards } from "./user-stats-cards";
import {
  useCan,
  useCanManageOrganizationMembership,
} from "@/hooks/api/access";
import { PeopleSectionTabs } from "./people-section-tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import {
  DEFAULT_PAGE_SIZE,
  getLastPage,
  parsePage,
  parsePageSize,
  STANDARD_PAGE_SIZE_OPTIONS,
} from "@/lib/list-pagination";
import { UserBulkActionsBar } from "./user-bulk-actions-bar";
import {
  getUserBulkActionCopy,
} from "./user-bulk-action-copy";
import { UserDirectoryFilters } from "./user-directory-filters";
import { getUserTableColumns } from "./user-table-columns";
import { UserDirectoryActions } from "./user-directory-actions";
import { useUserBulkLifecycle } from "./use-user-bulk-lifecycle";

export function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchQuery = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const role = searchParams.get("role") ?? "all";
  const departmentId = searchParams.get("departmentId") ?? "all";
  const branchId = searchParams.get("branchId") ?? "all";
  const sortBy = (searchParams.get("sortBy") as "name" | "joinedAt" | "status") ?? "joinedAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("size"));

  const [search, setSearch] = useState(searchQuery);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(
    () => searchParams.get("create") === "1",
  );
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (
          v === null ||
          v === "all" ||
          (k === "page" && v === "1") ||
          (k === "size" && v === String(DEFAULT_PAGE_SIZE))
        )
          params.delete(k);
        else params.set(k, v);
      }
      const queryString = params.toString();
      startTransition(() => {
        router.replace(
          queryString ? `${pathname}?${queryString}` : pathname,
          { scroll: false },
        );
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;
    pushParams({ search: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchQuery, pushParams]);

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

  const {
    data,
    isLoading,
    isError,
    isPlaceholderData,
    error,
    refetch,
  } = useUsers(
    {
      page,
      limit: pageSize,
      search: searchQuery || undefined,
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
  const canCreate = useCanManageOrganizationMembership();
  const canManage = useCan("settings:organization:manage");
  const canExport = useCan("settings:organization:manage");

  const branchNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const branch of branchesData?.data ?? [])
      names.set(String(branch.id), branch.name);
    return names;
  }, [branchesData]);

  const departmentNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const department of departmentsData?.data ?? [])
      names.set(String(department.id), department.name);
    return names;
  }, [departmentsData]);

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const isPageOutOfRange =
    !!pagination && page > getLastPage(pagination.total, pageSize);
  const someSelected = selectedUserIds.size > 0;

  function handleRowClick(user: User) {
    setSelectedUserId(user.id);
    setSheetOpen(true);
  }

  const handleSelectionChange = useCallback(
    (selectedRowIds: Set<string | number>) =>
      setSelectedUserIds(new Set([...selectedRowIds].map(String))),
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
    setSelectedUserIds(new Set());
  }, []);
  const {
    pendingBulkAction,
    isSuspending,
    isArchiving,
    isRestoring,
    handleRequestBulkSuspend,
    handleRequestBulkArchive,
    handleRequestBulkRestore,
    handleBulkDialogOpenChange,
    handleConfirmBulkAction,
  } = useUserBulkLifecycle(selectedUserIds, handleClearSelection);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAssignSuccess = useCallback(() => setSelectedUserIds(new Set()), []);
  const handlePageChange = useCallback(
    (nextPage: number) =>
      pushParams({ page: nextPage === 1 ? null : String(nextPage) }),
    [pushParams],
  );
  const handlePageSizeChange = useCallback(
    (size: number) =>
      pushParams({
        size: size === DEFAULT_PAGE_SIZE ? null : String(size),
        page: null,
      }),
    [pushParams],
  );

  useEffect(() => {
    if (!pagination || isPlaceholderData) return;
    const lastPage = getLastPage(pagination.total, pageSize);
    if (page > lastPage) handlePageChange(lastPage);
  }, [handlePageChange, isPlaceholderData, page, pageSize, pagination]);

  const handleViewUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setSheetOpen(true);
  }, []);

  const columns = useMemo(
    () => getUserTableColumns(branchNames, departmentNames, handleViewUser),
    [branchNames, departmentNames, handleViewUser],
  );

  const emptyStateNode = (
    <EmptyState
      illustrationPreset="team"
      title="No members found"
      description={
        searchQuery || status !== "all" || role !== "all"
          ? "Try adjusting your search or filters."
          : "Invite your first team member to get started."
      }
      action={
        !searchQuery && status === "all" && role === "all" && canCreate
          ? { label: "Invite User", onClick: handleOpenInvite }
          : undefined
      }
    />
  );

  return (
    <>
      <PageWrapper
        title="Members & access"
        subtitle="Manage people who can sign in, their roles, and organization access."
        actions={
          <UserDirectoryActions
            canCreate={canCreate}
            canExport={canExport}
            isExporting={isExporting}
            onExport={handleExport}
            onImport={handleOpenImport}
            onBulkInvite={handleOpenBulkInvite}
            onInvite={handleOpenInvite}
          />
        }
        filters={
          <PageTabsToolbar
            collapseBelow="lg"
            tabs={<PeopleSectionTabs />}
            search={
              <SearchInput
                placeholder="Search users..."
                value={search}
                onValueChange={handleSearchChange}
              />
            }
            filters={
              <UserDirectoryFilters
                status={status}
                role={role}
                departmentId={departmentId}
                branchId={branchId}
                departments={departmentsData?.data ?? []}
                branches={branchesData?.data ?? []}
                onStatusChange={handleStatusChange}
                onRoleChange={handleRoleChange}
                onDepartmentChange={handleDeptChange}
                onBranchChange={handleBranchChange}
              />
            }
          />
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <UserStatsCards />

          {someSelected && (
            <UserBulkActionsBar
              selectedUserCount={selectedUserIds.size}
              canManage={canManage}
              isSuspending={isSuspending}
              isArchiving={isArchiving}
              isRestoring={isRestoring}
              onSuspend={handleRequestBulkSuspend}
              onArchive={handleRequestBulkArchive}
              onRestore={handleRequestBulkRestore}
              onAssign={handleOpenAssign}
              onClear={handleClearSelection}
            />
          )}

          {isError ? (
            <ErrorState
              title="Failed to load members"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              className="flex-1 min-h-0"
              data={users}
              columns={columns}
              getRowKey={(user) => user.id}
              onRowClick={handleRowClick}
              isLoading={isLoading || isPageOutOfRange}
              emptyState={emptyStateNode}
              selection={{
                selected: selectedUserIds,
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
                pageSize,
                total: pagination?.total ?? 0,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
                pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
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
      {canCreate ? (
        <>
          <UserInviteDialog open={inviteOpen} onOpenChange={handleInviteChange} />
          <UserBulkInviteDialog
            open={bulkInviteOpen}
            onOpenChange={handleBulkInviteChange}
          />
          <UserImportDialog open={importOpen} onOpenChange={handleImportChange} />
        </>
      ) : null}
      <UserBulkAssignDialog
        open={assignOpen}
        onOpenChange={handleAssignChange}
        selectedIds={selectedUserIds}
        onSuccess={handleAssignSuccess}
      />
      {pendingBulkAction !== null && (
        <ConfirmDialog
          open
          onOpenChange={handleBulkDialogOpenChange}
          title={getUserBulkActionCopy(pendingBulkAction, selectedUserIds.size).title}
          description={
            getUserBulkActionCopy(pendingBulkAction, selectedUserIds.size).description
          }
          confirmLabel={
            getUserBulkActionCopy(pendingBulkAction, selectedUserIds.size).confirmLabel
          }
          isPending={
            pendingBulkAction === "suspend"
              ? isSuspending
              : pendingBulkAction === "archive"
                ? isArchiving
                : isRestoring
          }
          onConfirm={handleConfirmBulkAction}
        />
      )}
    </>
  );
}
