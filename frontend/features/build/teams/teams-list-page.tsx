"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import Link from "next/link";
import { useProjectTeams, useCreateProjectTeam, useUpdateProjectTeam, useDeleteProjectTeam } from "@/hooks/api/build/teams";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
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
import { TeamFormSheet } from "./team-form-sheet";
import type { ProjectTeam, CreateTeamInput, UpdateTeamInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

function NewTeamButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
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

export function TeamsListPage() {
  const canCreate = useCan("build:teams:create");
  const canManage = useCan("build:teams:manage");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ProjectTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTeam | null>(null);

  const { data, isLoading, isError, refetch } = useProjectTeams({
    page,
    pageSize: 50,
    search: search.trim() || undefined,
  });

  const createTeam = useCreateProjectTeam();
  const updateTeam = useUpdateProjectTeam();
  const deleteTeam = useDeleteProjectTeam();

  const teams = useMemo(() => data?.data ?? [], [data]);

  function handleCreate(input: CreateTeamInput) {
    createTeam.mutate(input, {
      onSuccess: () => {
        toast.success("Team created");
        setCreateOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdateTeamInput & { id: number }) {
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
    setSearch(value);
    setPage(1);
  }

  function handleClearSearch() {
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
      sortable: true,
      sortValue: (r) => r.name,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          {row.icon ? (
            <span className="text-base leading-none">{row.icon}</span>
          ) : (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
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
            <Badge variant="outline" className="text-[10px]">
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

  const isFiltered = !!search.trim();
  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        className="w-full min-w-0 sm:w-52"
        placeholder="Search teams…"
        value={search}
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
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={4} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : teams.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="projects"
              title={isFiltered ? "No matching teams" : "No teams yet"}
              description={
                isFiltered
                  ? "Try adjusting your search."
                  : "Create a team to group members and track work together."
              }
              action={
                isFiltered
                  ? { label: "Clear search", onClick: handleClearSearch }
                  : canCreate
                    ? { label: "New Team", onClick: handleOpenCreate }
                    : undefined
              }
            />
          ) : (
            <DataTable
              data={teams}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="560px"
              className={PM_FILL_PANEL}
              pagination={
                data && data.total > 50
                  ? {
                      mode: "server",
                      page,
                      pageSize: 50,
                      total: data.total,
                      onPageChange: setPage,
                    }
                  : undefined
              }
            />
          )}
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Members will be removed from the team.
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
