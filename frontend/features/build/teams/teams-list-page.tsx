"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import Link from "next/link";
import { useProjectTeams, useCreateProjectTeam, useUpdateProjectTeam, useDeleteProjectTeam } from "@/hooks/api/build/teams";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamFormSheet } from "./team-form-sheet";
import type { ProjectTeam, CreateTeamInput, UpdateTeamInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

function NewTeamButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> New Team
    </Button>
  );
}

function TeamRowActions({
  team,
  onEdit,
  onDelete,
}: {
  team: ProjectTeam;
  onEdit: (t: ProjectTeam) => void;
  onDelete: (t: ProjectTeam) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(team), [team, onEdit]);
  const handleDelete = useCallback(() => onDelete(team), [team, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Team actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TeamsListPageProps {
  pmWorkspaceId?: string;
}

export function TeamsListPage({ pmWorkspaceId }: TeamsListPageProps = {}) {
  const canCreate = useCan("build:teams:create");
  const canManage = useCan("build:teams:manage");

  const { cursor, setCursor, setListParams, clearFilters } = useBuildListUrlState();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlQ);
  const debouncedSearchInput = useDebouncedValue(searchInput, 300);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ProjectTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTeam | null>(null);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearchInput === current) return;
    setListParams({ q: debouncedSearchInput || null });
  }, [debouncedSearchInput, searchParams, setListParams]);

  const { data, isLoading, isError, error, refetch } = useProjectTeams({
    cursor: cursor ?? undefined,
    pageSize: 50,
    search: urlQ.trim() || undefined,
    ...(pmWorkspaceId ? { pmWorkspaceId } : {}),
  });

  const createTeam = useCreateProjectTeam();
  const updateTeam = useUpdateProjectTeam();
  const deleteTeam = useDeleteProjectTeam();

  const teams = useMemo(() => data?.data ?? [], [data]);

  const resolution = usePageState({
    permission: "build:teams:view",
    isLoading,
    isError,
    error,
    isEmpty: teams.length === 0,
  });

  function handleCreate(input: CreateTeamInput) {
    createTeam.mutate(input, {
      onSuccess: () => {
        toast.success("Team created");
        setCreateOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdateTeamInput & { teamId: number }) {
    updateTeam.mutate(input, {
      onSuccess: () => {
        toast.success("Team updated");
        setEditTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteTeam.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Team deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setCursorStack([]);
  }

  function handleClearSearch() {
    setSearchInput("");
    clearFilters();
    setCursorStack([]);
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
    setCursor(prevCursor === "" ? null : prevCursor);
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

  function handleEditRow(row: ProjectTeam) {
    setEditTarget(row);
  }

  function handleDeleteRow(row: ProjectTeam) {
    setDeleteTarget(row);
  }

  const columns: DataTableColumn<ProjectTeam>[] = [
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          {row.icon ? (
            <span className="text-base leading-none">{row.icon}</span>
          ) : (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-micro font-bold text-white"
              style={{ backgroundColor: row.color ?? "#64748b" }}
            >
              {row.key.slice(0, 2)}
            </span>
          )}
          <Link
            href={`/build/teams/${row.id}`}
            className={cn(
              "font-medium text-foreground hover:text-primary",
              TEXT_ONE_LINE,
            )}
            title={row.name}
          >
            {row.name}
          </Link>
          {row.isPrivate ? (
            <Badge variant="outline" className="text-micro">
              Private
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "key",
      header: "Key",
      className: "w-20",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.key}</span>
      ),
    },
    {
      key: "members",
      header: "Members",
      className: "w-28",
      cell: (row) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {row.memberCount ?? 0}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) =>
        canManage ? (
          <TeamRowActions team={row} onEdit={handleEditRow} onDelete={handleDeleteRow} />
        ) : null,
    },
  ];

  const isFiltered = !!searchInput.trim();
  const hasPrev = cursorStack.length > 0;
  const hasNext = !!data?.pagination.hasMore;

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput className="min-w-0"
        placeholder="Search teams…"
        value={searchInput}
        onValueChange={handleSearchChange}
      />
      {isFiltered ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={handleClearSearch}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title="Teams"
      subtitle="Organise members into cross-functional teams"
      filters={filtersBar}
      actions={
        canCreate ? <NewTeamButton onClick={handleOpenCreate} /> : undefined
      }
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
                title="No teams yet"
                description={
                  isFiltered
                    ? undefined
                    : "Create a team to group members and track work together."
                }
                filtersActive={isFiltered}
                onClearFilters={handleClearSearch}
                action={
                  !isFiltered && canCreate
                    ? { label: "New Team", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <>
              <DataTable
                data={teams}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="560px"
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

      <TeamFormSheet
        open={createOpen || !!editTarget}
        onOpenChange={handleSheetOpenChange}
        mode={editTarget ? "edit" : "create"}
        defaultValues={editTarget ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        isPending={createTeam.isPending || updateTeam.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this team?"
        description="This action cannot be undone. Members will be removed from the team."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
