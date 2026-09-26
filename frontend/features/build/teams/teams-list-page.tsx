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
import { usePageState } from "@/hooks/api/use-page-state";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { useCursorPager } from "@/components/ui/table-pagination";
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
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
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
  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
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

  const resolution = usePageState({
    permission: "build:teams:view",
    isLoading,
    isError,
    error,
    isEmpty: teams.length === 0,
  });

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
          <PageState
            resolution={resolution}
            loading={
              <DataTableSkeleton
                mobileCards
                rows={12}
                headers={TEAM_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              !isOnline ? (
                <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="projects"
                  title="You are offline"
                  description="Reconnect to see the latest teams."
                />
              ) : (
                <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="projects"
                  title="No teams yet"
                  description="Create a team to group members and track work together."
                  filtersActive={listFilters.isFiltered}
                  onClearFilters={listFilters.clearAll}
                  action={canCreate ? { label: "New team", onClick: handleOpenCreate } : undefined}
                />
              )
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={teams}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="560px"
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
