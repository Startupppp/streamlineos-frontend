"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { ProgramFormSheet } from "./program-form-sheet";
import type { Program } from "@/types/projects";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import {
  PROGRAM_TABLE_HEADERS,
  ProgramMobileCard,
} from "./program-table-columns";
import { ProgramsToolbar } from "./programs-toolbar";
import { useProgramsPage, PAGE_SIZE } from "./use-programs-page";

export function ProgramsPage() {
  const {
    canManage,
    listFilters,
    data,
    isLoading,
    isError,
    error,
    rows,
    columns,
    ownerOf,
    portfolioName,
    ownerOptions,
    portfolioOptions,
    projectOptions,
    createOpen,
    editTarget,
    deleteTarget,
    handleCreate,
    handleEdit,
    handleDeleteConfirm,
    handleOpenCreate,
    handleSheetOpenChange,
    handleDeleteDialogChange,
    handleRetry,
    handleNextPage,
    handleEditRow,
    handleDeleteRow,
    searchInputRef,
    pageNumber,
    hasPrevious,
    goPrevious,
    createProgram,
    updateProgram,
    deleteProgram,
  } = useProgramsPage();

  const renderMobileCard = useCallback(
    (row: Program) => (
      <ProgramMobileCard
        program={row}
        canManage={canManage}
        ownerOf={ownerOf}
        portfolioName={portfolioName}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, handleDeleteRow, handleEditRow, ownerOf, portfolioName],
  );

  return (
    <PageWrapper
      title="Programs"
      subtitle="Coordinate related projects as a single program of work"
      filters={
        <ProgramsToolbar
          filters={listFilters}
          ownerOptions={ownerOptions}
          portfolioOptions={portfolioOptions}
          projectOptions={projectOptions}
          searchInputRef={searchInputRef}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canManage
              ? [
                  {
                    id: "create",
                    label: "New program",
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
          <BuildListSurface<Program>
            permission="build:programs:view"
            rows={rows}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            minWidth="780px"
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
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="No programs yet"
                description="Create a program to coordinate related projects toward one outcome."
                action={
                  canManage
                    ? { label: "New program", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="No programs match your filters"
                description="Try adjusting the filters to see more programs."
                onClearFilters={listFilters.clearAll}
              />
            }
            loadingHeaders={PROGRAM_TABLE_HEADERS}
            loadingRows={12}
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <ProgramFormSheet
        open={createOpen || !!editTarget}
        onOpenChange={handleSheetOpenChange}
        mode={editTarget ? "edit" : "create"}
        defaultValues={editTarget ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        isPending={createProgram.isPending || updateProgram.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this program?"
        description="This action cannot be undone. Projects will not be deleted."
        confirmLabel="Delete"
        destructive
        isPending={deleteProgram.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
