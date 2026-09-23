"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  usePmWorkspaces,
  useCreatePmWorkspace,
  useUpdatePmWorkspace,
  useDeletePmWorkspace,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCursorPager } from "@/components/ui/table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PmWorkspaceFormSheet } from "./pm-workspace-form-sheet";
import { PmWorkspaceMembersSheet } from "./pm-workspace-members-sheet";
import type {
  PmWorkspace,
  CreatePmWorkspaceInput,
  UpdatePmWorkspaceInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import {
  PM_WORKSPACE_TABLE_HEADERS,
  PmWorkspaceMobileCard,
  buildPmWorkspaceColumns,
} from "./pm-workspace-table-columns";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((option) => option.value),
  },
] as const;

export function PmWorkspacesPage() {
  const canCreate = useCan("build:workspaces:create");
  const canUpdate = useCan("build:workspaces:update");
  const canDelete = useCan("build:workspaces:delete");
  const canViewMembers = useCan("build:workspaces:members:view");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<PmWorkspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PmWorkspace | null>(null);
  const [membersTarget, setMembersTarget] = useState<PmWorkspace | null>(null);

  const statusValue = listFilters.value("status");
  const { data, isLoading, isError, error, refetch } = usePmWorkspaces({
    cursor,
    limit: PAGE_SIZE,
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
  });

  const createWorkspace = useCreatePmWorkspace();
  const updateWorkspace = useUpdatePmWorkspace();
  const deleteWorkspace = useDeletePmWorkspace();

  const rows = useMemo(() => data?.data ?? [], [data]);
  const search = listFilters.debouncedSearch.trim().toLowerCase();
  const displayed = useMemo(() => {
    if (!search) return rows;
    return rows.filter(
      (w) =>
        w.name.toLowerCase().includes(search) ||
        w.slug.toLowerCase().includes(search),
    );
  }, [rows, search]);

  const resolution = usePageState({
    permission: "build:workspaces:view",
    isLoading,
    isError,
    error,
    isEmpty: displayed.length === 0,
  });

  const handleCreate = useCallback(
    (input: CreatePmWorkspaceInput) => {
      createWorkspace.mutate(input, {
        onSuccess: () => {
          toast.success("Workspace created");
          setCreateOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createWorkspace, setCreateOpen],
  );

  const handleEdit = useCallback(
    (input: UpdatePmWorkspaceInput & { pmWorkspaceId: string }) => {
      updateWorkspace.mutate(input, {
        onSuccess: () => {
          toast.success("Workspace updated");
          setEditTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateWorkspace],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteWorkspace.mutate(deleteTarget.pmWorkspaceId, {
      onSuccess: () => {
        toast.success("Workspace deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteWorkspace]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleOpenCreate = useCallback(() => {
    openCreate();
  }, [openCreate]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setCreateOpen(false);
        setEditTarget(null);
      }
    },
    [setCreateOpen],
  );

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleMembersSheetChange = useCallback((open: boolean) => {
    if (!open) setMembersTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEditRow = useCallback(
    (row: PmWorkspace) => setEditTarget(row),
    [],
  );
  const handleDeleteRow = useCallback(
    (row: PmWorkspace) => setDeleteTarget(row),
    [],
  );
  const handleMembersRow = useCallback(
    (row: PmWorkspace) => setMembersTarget(row),
    [],
  );

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const columns = useMemo(
    () =>
      buildPmWorkspaceColumns({
        canUpdate,
        canDelete,
        canViewMembers,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
        onMembers: handleMembersRow,
      }),
    [canDelete, canUpdate, canViewMembers, handleDeleteRow, handleEditRow, handleMembersRow],
  );

  const renderMobileCard = useCallback(
    (row: PmWorkspace) => (
      <PmWorkspaceMobileCard
        workspace={row}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canViewMembers={canViewMembers}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
        onMembers={handleMembersRow}
      />
    ),
    [canDelete, canUpdate, canViewMembers, handleDeleteRow, handleEditRow, handleMembersRow],
  );

  return (
    <PageWrapper
      title="PM Workspaces"
      subtitle="Group products, teams and projects under a workspace"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search workspaces…",
            label: "Search workspaces",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canCreate
              ? [
                  {
                    id: "create",
                    label: "New workspace",
                    icon: Plus,
                    primary: true,
                    onSelect: handleOpenCreate,
                  },
                ]
              : []
          }
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={resolution}
            loading={
              <DataTableSkeleton
                rows={12}
                headers={PM_WORKSPACE_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No PM workspaces yet"
                description="Create a workspace to organize products, teams and projects."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  canCreate
                    ? { label: "New workspace", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={displayed}
              columns={columns}
              getRowKey={(row) => row.pmWorkspaceId}
              minWidth="600px"
              mobileCard={renderMobileCard}
              className={PM_FILL_PANEL}
              pagination={{
                mode: "cursor",
                pageSize: PAGE_SIZE,
                hasMore: Boolean(data?.pagination.hasMore),
                hasPrevious,
                onNext: handleNextPage,
                onPrevious: goPrevious,
              }}
            />
          </PageState>
        </PmSection>
      </PmPageShell>

      {createOpen && (
        <PmWorkspaceFormSheet
          open={createOpen}
          onOpenChange={handleSheetOpenChange}
          mode="create"
          onSubmitCreate={handleCreate}
          isPending={createWorkspace.isPending}
        />
      )}

      {editTarget && (
        <PmWorkspaceFormSheet
          open={!!editTarget}
          onOpenChange={handleSheetOpenChange}
          mode="edit"
          defaultValues={editTarget}
          onSubmitEdit={handleEdit}
          isPending={updateWorkspace.isPending}
        />
      )}

      {membersTarget && (
        <PmWorkspaceMembersSheet
          workspace={membersTarget}
          open={!!membersTarget}
          onOpenChange={handleMembersSheetChange}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this workspace?"
        description="This action cannot be undone. Products, teams and projects in this workspace will not be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
