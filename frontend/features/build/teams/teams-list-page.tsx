"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { toast } from "sonner";
import {
  useProjectTeams,
  useCreateProjectTeam,
  useUpdateProjectTeam,
  useDeleteProjectTeam,
} from "@/hooks/api/build/teams";
import { useCan } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamFormSheet } from "./team-form-sheet";
import type {
  ProjectTeam,
  CreateTeamInput,
  UpdateTeamInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters, BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import {
  TEAM_TABLE_HEADERS,
  TeamMobileCard,
  buildTeamColumns,
} from "./team-table-columns";

const PAGE_SIZE = 50;

const FILTER_DEFINITIONS = [{ param: "leadId" }, { param: "memberId" }] as const;

export function TeamsListPage() {
  const router = useRouter();
  const canCreate = useCan("build:teams:create");
  const canManage = useCan("build:teams:manage");
  const isOnline = useOnlineStatus();
  const searchRef = useRef<HTMLInputElement>(null);

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS, withSearch: true });
  const leadIdFilter = listFilters.value("leadId");
  const memberIdFilter = listFilters.value("memberId");
  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const {
    open: createOpen,
    onOpenChange: setCreateOpen,
    setOpen: openCreate,
  } = useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ProjectTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTeam | null>(null);

  const { data, isLoading, isError, error, refetch } = useProjectTeams({
    cursor,
    pageSize: PAGE_SIZE,
    search: listFilters.debouncedSearch.trim() || undefined,
    leadId: leadIdFilter !== BUILD_FILTER_ALL ? leadIdFilter : undefined,
    memberId: memberIdFilter !== BUILD_FILTER_ALL ? memberIdFilter : undefined,
  });
  const createTeam = useCreateProjectTeam();
  const updateTeam = useUpdateProjectTeam();
  const deleteTeam = useDeleteProjectTeam();

  const teams = useMemo(() => data?.data ?? [], [data]);

  const handleCreate = useCallback(
    (input: CreateTeamInput) => {
      createTeam.mutate(input, {
        onSuccess: () => {
          toast.success("Team created");
          setCreateOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createTeam, setCreateOpen],
  );

  const handleEdit = useCallback(
    (input: UpdateTeamInput & { teamId: number }) => {
      updateTeam.mutate(input, {
        onSuccess: () => {
          toast.success("Team updated");
          setEditTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateTeam],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteTeam.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Team deleted");
        setDeleteTarget(null);
      },
      onError: (e) => {
        if (isApiError(e) && e.status === 409) {
          toast.info("Team was modified by someone else. Refreshing…");
          void refetch();
          setDeleteTarget(null);
          return;
        }
        toast.error(getErrorMessage(e));
      },
    });
  }, [deleteTarget, deleteTeam, refetch]);

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

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEditRow = useCallback(
    (row: ProjectTeam) => setEditTarget(row),
    [],
  );
  const handleDeleteRow = useCallback(
    (row: ProjectTeam) => setDeleteTarget(row),
    [],
  );

  const handleNextPage = useCallback(() => {
    goNext(data?.pagination.nextCursor);
  }, [data, goNext]);

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const team = teams[index];
      if (team) router.push(`/build/teams/${team.id}`);
    },
    [teams, router],
  );

  const handleKeyboardClear = useCallback(() => {
    setEditTarget(null);
  }, []);

  useBuildListKeyboard({
    itemCount: teams.length,
    onOpen: handleKeyboardOpen,
    onCreate: canCreate ? handleOpenCreate : undefined,
    onClearSelection: handleKeyboardClear,
    searchInputRef: searchRef,
    enabled: !isLoading,
  });

  const columns = useMemo(
    () =>
      buildTeamColumns({
        canManage,
        onEdit: handleEditRow,
        onDelete: handleDeleteRow,
      }),
    [canManage, handleDeleteRow, handleEditRow],
  );

  const renderMobileCard = useCallback(
    (row: ProjectTeam) => (
      <TeamMobileCard
        team={row}
        canManage={canManage}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, handleDeleteRow, handleEditRow],
  );

  return (
    <PageWrapper
      title="Teams"
      subtitle="Organise members into cross-functional teams"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search teams…",
            label: "Search teams",
            inputRef: searchRef,
          }}
          onClearAll={listFilters.activeCount > 0 ? listFilters.clearAll : undefined}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canCreate
              ? [
                  {
                    id: "create",
                    label: "New team",
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
          <BuildListSurface<ProjectTeam>
            permission="build:teams:view"
            rows={teams}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            minWidth="560px"
            mobileCard={renderMobileCard}
            pagination={{
              mode: "cursor",
              pageSize: PAGE_SIZE,
              pageNumber,
              hasMore: Boolean(data?.pagination.hasMore),
              hasPrevious,
              onNext: handleNextPage,
              onPrevious: goPrevious,
            }}
            empty={
              !isOnline ? (
                <EmptyState
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="projects"
                  title="You are offline"
                  description="Reconnect to see the latest teams."
                />
              ) : (
                <EmptyState
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="team"
                  title="No teams yet"
                  description="Create a team to group members and track work together."
                  action={canCreate ? { label: "New team", onClick: handleOpenCreate } : undefined}
                />
              )
            }
            filteredEmpty={
              !isOnline ? (
                <EmptyState
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="projects"
                  title="You are offline"
                  description="Reconnect to see the latest teams."
                />
              ) : (
                <EmptyState
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="projects"
                  title="No teams match your filters"
                  description="Try adjusting the filters to see more teams."
                  onClearFilters={listFilters.clearAll}
                />
              )
            }
            loadingHeaders={TEAM_TABLE_HEADERS}
            loadingRows={12}
            onRetry={handleRetry}
          />
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
