"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  usePmWorkspaces,
  useCreatePmWorkspace,
  useUpdatePmWorkspace,
  useDeletePmWorkspace,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PmWorkspaceStatusBadge } from "./pm-workspace-status-badge";
import { PmWorkspaceFormSheet } from "./pm-workspace-form-sheet";
import { PmWorkspaceMembersSheet } from "./pm-workspace-members-sheet";
import type {
  PmWorkspace,
  CreatePmWorkspaceInput,
  UpdatePmWorkspaceInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

function NewWorkspaceButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> New Workspace
    </Button>
  );
}

function WorkspaceRowActions({
  workspace,
  canUpdate,
  canDelete,
  canViewMembers,
  onEdit,
  onDelete,
  onMembers,
}: {
  workspace: PmWorkspace;
  canUpdate: boolean;
  canDelete: boolean;
  canViewMembers: boolean;
  onEdit: (w: PmWorkspace) => void;
  onDelete: (w: PmWorkspace) => void;
  onMembers: (w: PmWorkspace) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(workspace), [workspace, onEdit]);
  const handleDelete = useCallback(() => onDelete(workspace), [workspace, onDelete]);
  const handleMembers = useCallback(() => onMembers(workspace), [workspace, onMembers]);
  const canDeleteRow = canDelete && !workspace.isDefault;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Workspace actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate ? (
          <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        ) : null}
        {canViewMembers ? (
          <DropdownMenuItem onClick={handleMembers}>Members</DropdownMenuItem>
        ) : null}
        {canDeleteRow ? (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PmWorkspacesPage() {
  const canCreate = useCan("build:workspaces:create");
  const canUpdate = useCan("build:workspaces:update");
  const canDelete = useCan("build:workspaces:delete");
  const canViewMembers = useCan("build:workspaces:members:view");

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<PmWorkspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PmWorkspace | null>(null);
  const [membersTarget, setMembersTarget] = useState<PmWorkspace | null>(null);

  const { data, isLoading, isError, refetch } = usePmWorkspaces({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const createWorkspace = useCreatePmWorkspace();
  const updateWorkspace = useUpdatePmWorkspace();
  const deleteWorkspace = useDeletePmWorkspace();

  const displayed = useMemo(() => {
    if (!search.trim()) return data?.data ?? [];
    const q = search.toLowerCase();
    return (data?.data ?? []).filter(
      (w) => w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q),
    );
  }, [data, search]);

  function handleCreate(input: CreatePmWorkspaceInput) {
    createWorkspace.mutate(input, {
      onSuccess: () => {
        toast.success("Workspace created");
        setCreateOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdatePmWorkspaceInput & { pmWorkspaceId: string }) {
    updateWorkspace.mutate(input, {
      onSuccess: () => {
        toast.success("Workspace updated");
        setEditTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteWorkspace.mutate(deleteTarget.pmWorkspaceId, {
      onSuccess: () => {
        toast.success("Workspace deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleClearFilters() {
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  }

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

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  function handleEditRow(row: PmWorkspace) {
    setEditTarget(row);
  }

  function handleDeleteRow(row: PmWorkspace) {
    setDeleteTarget(row);
  }

  function handleMembersRow(row: PmWorkspace) {
    setMembersTarget(row);
  }

  function handleMembersSheetChange(open: boolean) {
    if (!open) setMembersTarget(null);
  }

  const canManageRow = canUpdate || canDelete || canViewMembers;

  const columns: DataTableColumn<PmWorkspace>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("font-medium text-foreground", TEXT_ONE_LINE)} title={row.name}>
            {row.name}
          </span>
          {row.isDefault ? (
            <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Default
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      className: "w-40",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.slug}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <PmWorkspaceStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) =>
        canManageRow ? (
          <WorkspaceRowActions
            workspace={row}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canViewMembers={canViewMembers}
            onEdit={handleEditRow}
            onDelete={handleDeleteRow}
            onMembers={handleMembersRow}
          />
        ) : null,
    },
  ];

  const isFiltered = statusFilter !== "all" || !!search.trim();
  const pagination = data?.pagination;

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SearchInput
        placeholder="Search workspaces…"
        value={search}
        onValueChange={handleSearchChange}
      />
      {isFiltered ? (
        <Button size="sm" variant="ghost" className="text-xs" onClick={handleClearFilters}>
          Clear
        </Button>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title="PM Workspaces"
      subtitle="Group products, teams and projects under a workspace"
      filters={filtersBar}
      actions={canCreate ? <NewWorkspaceButton onClick={handleOpenCreate} /> : undefined}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={4} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : displayed.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="projects"
              title={isFiltered ? "No matching workspaces" : "No PM workspaces yet"}
              description={
                isFiltered
                  ? "Try adjusting your filters."
                  : "Create a workspace to organize products, teams and projects."
              }
              action={
                isFiltered
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : canCreate
                    ? { label: "New Workspace", onClick: handleOpenCreate }
                    : undefined
              }
            />
          ) : (
            <>
              <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.pmWorkspaceId}
                minWidth="600px"
                className={PM_FILL_PANEL}
              />
              {pagination && pagination.totalPages > 1 ? (
                <TablePagination
                  page={pagination.page}
                  pageSize={pagination.limit}
                  total={pagination.total}
                  onPageChange={setPage}
                  className="mt-2 px-1"
                />
              ) : null}
            </>
          )}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Products, teams and projects in this workspace
              will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
