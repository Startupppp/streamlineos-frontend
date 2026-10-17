"use client";

import { useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamFormSheet } from "./team-form-sheet";
import type { ProjectTeam } from "@/types/projects";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import {
  TEAM_TABLE_HEADERS,
  TeamMobileCard,
  buildTeamColumns,
} from "./team-table-columns";
import { useTeamsListPage, PAGE_SIZE } from "./use-teams-list-page";

export function TeamsListPage() {
  const {
    canCreate,
    canManage,
    isOnline,
    searchRef,
    listFilters,
    createOpen,
    editTarget,
    deleteTarget,
    teams,
    data,
    isLoading,
    isError,
    error,
    pageNumber,
    hasPrevious,
    goPrevious,
    formIsPending,
    handleCreate,
    handleEdit,
    handleDeleteConfirm,
    handleOpenCreate,
    handleSheetOpenChange,
    handleDeleteDialogChange,
    handleRetry,
    handleEditRow,
    handleDeleteRow,
    handleNextPage,
  } = useTeamsListPage();

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
        isPending={formIsPending}
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
