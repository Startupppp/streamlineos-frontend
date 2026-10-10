"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DecideDialog } from "./decide-dialog";
import { DelegateDialog } from "./delegate-dialog";
import { RequestApprovalSheet } from "./request-approval-sheet";
import { RequestApprovalMenuButton } from "./approvals-toolbar";
import { ApprovalBulkActionBar } from "./approval-bulk-action-bar";
import { ApprovalsFilterBar } from "./approvals-filter-bar";
import { ApprovalStatusBadge } from "./approval-status-badge";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { APPROVALS_TABLE_HEADERS } from "./use-approvals-columns";
import {
  APPROVAL_STATUS_VALUES,
  entityTypeLabel,
} from "./approvals-constants";
import type { BuildApprovalsCreateApprovalResponse } from "@/contracts/build-contracts.generated";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { useApprovalsPage } from "./use-approvals-page";

interface ProjectApprovalsPageProps {
  projectId: number;
}

export function ProjectApprovalsPage({
  projectId,
}: ProjectApprovalsPageProps) {
  const {
    currentUserId,
    canRequest,
    canManage,
    listFilters,
    statusValue,
    entityTypeValue,
    actorIdValue,
    approverOptions,
    isLoading,
    isError,
    error,
    pageNumber,
    hasPrevious,
    hasMore,
    items,
    members,
    ownerOf,
    selectedIds,
    setSelectedIds,
    requestOpen,
    setRequestOpen,
    defaultEntityType,
    decideTarget,
    delegateTarget,
    cancelTarget,
    deleteTarget,
    isBulkPending,
    createApproval,
    updateApproval,
    columns,
    handleRequestTask,
    handleRequestRelease,
    handleRequestMilestone,
    handleBulkCancel,
    handleClearSelection,
    handleCreate,
    handleDelegate,
    handleCancelConfirm,
    handleDeleteConfirm,
    handleRetry,
    handleNextPage,
    handlePreviousPage,
    isRowSelectable,
    handleDecideDialogChange,
    handleDelegateDialogChange,
    handleCancelDialogChange,
    handleDeleteDialogChange,
    handleStatusChange,
    handleEntityTypeChange,
    handleActorIdChange,
  } = useApprovalsPage(projectId);

  const renderMobileCard = useCallback(
    (row: BuildApprovalsCreateApprovalResponse) => {
      const narrowStatus =
        APPROVAL_STATUS_VALUES.find((v) => v === row.status) ?? "pending";
      return (
        <BuildMobileCard
          title={row.title}
          status={<ApprovalStatusBadge status={narrowStatus} />}
          person={{ user: ownerOf(row.approverMembershipId), role: "Approver" }}
          meta={[
            { label: "Type", value: entityTypeLabel(row.entityType) },
            {
              label: "Due",
              value: row.dueAt ? row.dueAt.slice(0, 10) : "—",
            },
          ]}
        />
      );
    },
    [ownerOf],
  );

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and manage approval requests for this project"
      filters={
        <ApprovalsFilterBar
          statusValue={statusValue}
          entityTypeValue={entityTypeValue}
          actorIdValue={actorIdValue}
          approverOptions={approverOptions}
          isStatusActive={listFilters.isActive("status")}
          isEntityTypeActive={listFilters.isActive("entityType")}
          isActorIdActive={listFilters.isActive("actorId")}
          onStatusChange={handleStatusChange}
          onEntityTypeChange={handleEntityTypeChange}
          onActorIdChange={handleActorIdChange}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        canRequest ? (
          <RequestApprovalMenuButton
            onRequestTask={handleRequestTask}
            onRequestRelease={handleRequestRelease}
            onRequestMilestone={handleRequestMilestone}
          />
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {canManage && selectedIds.size > 0 && (
            <ApprovalBulkActionBar
              selectedCount={selectedIds.size}
              isPending={isBulkPending}
              onCancelSelected={handleBulkCancel}
              onClear={handleClearSelection}
            />
          )}
          <BuildListSurface<BuildApprovalsCreateApprovalResponse>
            permission="build:approvals:view"
            rows={items}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            mobileCard={renderMobileCard}
            selection={{
              selected: selectedIds,
              onChange: setSelectedIds,
              isRowSelectable,
              getRowLabel: (row) => row.title,
            }}
            pagination={{
              mode: "cursor",
              pageSize: 25,
              pageNumber,
              hasPrevious,
              hasMore,
              onNext: handleNextPage,
              onPrevious: handlePreviousPage,
            }}
            minWidth="720px"
            loadingHeaders={APPROVALS_TABLE_HEADERS}
            loadingRows={12}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals yet"
                description="Use approvals to get sign-off on tasks, milestones, and releases before they ship."
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals match your filters"
                description="Try adjusting the filters to see more approvals."
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <RequestApprovalSheet
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onSubmit={handleCreate}
        isPending={createApproval.isPending}
        projectId={projectId}
        currentUserId={currentUserId}
        defaultEntityType={defaultEntityType}
      />
      <DecideDialog
        open={!!decideTarget}
        onOpenChange={handleDecideDialogChange}
        projectId={projectId}
        approvalId={decideTarget?.id ?? 0}
        revision={decideTarget?.revision ?? 0}
      />
      <DelegateDialog
        open={!!delegateTarget}
        onOpenChange={handleDelegateDialogChange}
        onConfirm={handleDelegate}
        isPending={updateApproval.isPending}
        members={members}
        currentApproverId={
          delegateTarget
            ? members.find(
                (member) =>
                  member.membershipId === delegateTarget.approverMembershipId,
              )?.id
            : undefined
        }
      />
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={handleCancelDialogChange}
        title="Cancel this approval?"
        description={
          cancelTarget?.title
            ? `"${cancelTarget.title}" will be marked cancelled and removed from the approver's inbox.`
            : "The request will be marked cancelled and removed from the approver's inbox."
        }
        confirmLabel="Cancel approval"
        cancelLabel="Keep"
        onConfirm={handleCancelConfirm}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this approval?"
        description={
          deleteTarget?.title
            ? `"${deleteTarget.title}" will be permanently deleted.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
