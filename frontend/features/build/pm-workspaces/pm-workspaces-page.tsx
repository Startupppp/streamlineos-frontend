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
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";

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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
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
    <Button onClick={onClick} {...hoverHandlers}>
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

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<PmWorkspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PmWorkspace | null>(null);
  const [membersTarget, setMembersTarget] = useState<PmWorkspace | null>(null);

  const { data, isLoading, isError, error, refetch } = usePmWorkspaces({
    cursor,
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

  const resolution = usePageState({
    permission: "build:workspaces:view",
    isLoading,
    isError,
    error,
    isEmpty: displayed.length === 0,
  });

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

  function resetCursor() {
    setCursor(undefined);
    setCursorStack([]);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetCursor();
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    resetCursor();
  }

  function handleClearFilters() {
    setStatusFilter("all");
    setSearch("");
    resetCursor();
  }

  function handleNextPage() {
    const nextCursor = data?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  }

  function handlePrevPage() {
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((prev) => prev.slice(0, -1));
    setCursor(prevCursor === "" ? undefined : prevCursor);
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
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("font-medium text-foreground", TEXT_ONE_LINE)} title={row.name}>
            {row.name}
          </span>
          {row.isDefault ? (
            <Badge variant="outline" className="px-1.5 py-0.5 text-micro text-muted-foreground">
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
  const hasPrev = cursorStack.length > 0;
  const hasNext = !!data?.pagination.hasMore;

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
          <PageState
            resolution={resolution}
            loading={<DataTableSkeleton rows={12} columns={4} className="flex-1" />}
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No PM workspaces yet"
                description={isFiltered ? undefined : "Create a workspace to organize products, teams and projects."}
                filtersActive={isFiltered}
                onClearFilters={handleClearFilters}
                action={canCreate && !isFiltered ? { label: "New Workspace", onClick: handleOpenCreate } : undefined}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <>
              <DataTable
                data={displayed}
                columns={columns}
                getRowKey={(row) => row.pmWorkspaceId}
                minWidth="600px"
                className={PM_FILL_PANEL}
              />
              {(hasPrev || hasNext) ? (
                <div className="flex items-center justify-end gap-2 border-t px-2 py-2">
                  <Button variant="outline" size="sm" disabled={!hasPrev} onClick={handlePrevPage}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={!hasNext} onClick={handleNextPage}>
                    Next
                  </Button>
                </div>
              ) : null}
            </>
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
