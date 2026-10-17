"use client";

import { useCallback } from "react";
import { GOVERNANCE_PAGE_SIZE } from "@/hooks/api/build/governance";
import type { Decision } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DecisionFormSheet } from "./decision-form-sheet";
import {
  DECISION_TABLE_HEADERS,
  DecisionMobileCard,
} from "./decisions-table-columns";
import { useDecisionsPage, STATUS_OPTIONS } from "./use-decisions-page";

interface DecisionsPageProps {
  projectId: number;
}

export function DecisionsPage({ projectId }: DecisionsPageProps) {
  const {
    canManage,
    listFilters,
    sheetOpen,
    editDecision,
    deleteTarget,
    decisionFieldErrors,
    pageNumber,
    hasPrevious,
    goPrevious,
    statusValue,
    ownerIdValue,
    ownerOptions,
    allDecisions,
    data,
    isLoading,
    isError,
    error,
    createIsPending,
    updateIsPending,
    columns,
    headerActions,
    ownerOf,
    handleCreate,
    handleUpdate,
    handleDeleteConfirm,
    handleStatusChange,
    handleOwnerChange,
    handleNewDecision,
    handleEditRow,
    handleDeleteRow,
    handleRetry,
    handleNextPage,
    handleAlertOpenChange,
    handleSheetOpenChange,
  } = useDecisionsPage(projectId);

  const renderMobileCard = useCallback(
    (row: Decision) => (
      <DecisionMobileCard
        decision={row}
        canManage={canManage}
        ownerOf={ownerOf}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, ownerOf, handleEditRow, handleDeleteRow],
  );

  return (
    <PageWrapper
      title="Decisions Log"
      subtitle="Log and track key project decisions for accountability and audit"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search decisions…",
            label: "Search decisions",
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
            {
              id: "ownerId",
              label: "Owner",
              active: listFilters.isActive("ownerId"),
              control: (
                <BuildFilterSelect
                  label="Owner"
                  value={ownerIdValue}
                  onValueChange={handleOwnerChange}
                  options={ownerOptions}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={<BuildHeaderActions actions={headerActions} />}
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <BuildListSurface<Decision>
            permission="build:decisions:view"
            rows={allDecisions}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            minWidth="720px"
            mobileCard={renderMobileCard}
            loadingHeaders={DECISION_TABLE_HEADERS}
            loadingRows={12}
            pagination={{
              mode: "cursor",
              pageSize: GOVERNANCE_PAGE_SIZE,
              pageNumber,
              hasMore: data?.hasMore ?? false,
              hasPrevious,
              onNext: handleNextPage,
              onPrevious: goPrevious,
            }}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="documents"
                title="No decisions recorded"
                description="Record key project decisions to maintain a clear audit trail."
                action={
                  canManage
                    ? { label: "Log Decision", onClick: handleNewDecision }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="documents"
                filtersActive
                filteredTitle="No decisions match your filters"
                description="Try adjusting the filters to see more decisions."
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <DecisionFormSheet
        open={sheetOpen || !!editDecision}
        onOpenChange={handleSheetOpenChange}
        mode={editDecision ? "edit" : "create"}
        defaultValues={editDecision ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createIsPending || updateIsPending}
        projectId={projectId}
        serverErrors={decisionFieldErrors}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete this decision?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
