"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useProjectApprovals,
  useCreateApproval,
  useUpdateApproval,
  useDeleteApproval,
} from "@/hooks/api/build/approvals";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
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
import { useApprovalsColumns, APPROVALS_TABLE_HEADERS } from "./use-approvals-columns";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { STATUS_OPTIONS, ENTITY_OPTIONS } from "./approvals-constants";
import type {
  Approval,
  ApprovalEntityType,
  ApprovalStatus,
  CreateApprovalInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";

const APPROVAL_STATUS_VALUES: ApprovalStatus[] = [
  "requested",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
  "cancelled",
];

const FILTER_DEFINITIONS = [
  { param: "status", options: STATUS_OPTIONS.map((o) => o.value) },
  { param: "entityType", options: ENTITY_OPTIONS.map((o) => o.value) },
  { param: "actorId" },
] as const;

interface ProjectApprovalsPageProps {
  projectId: number;
}

export function ProjectApprovalsPage({
  projectId,
}: ProjectApprovalsPageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const canRequest = useCan("build:approvals:request");
  const canDecide = useCan("build:approvals:decide");
  const canManage = useCan("build:approvals:manage");

  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: false,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [requestOpen, setRequestOpen] = useState(false);
  const [defaultEntityType, setDefaultEntityType] = useState<
    ApprovalEntityType | undefined
  >(undefined);
  const [decideTarget, setDecideTarget] = useState<Approval | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<Approval | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Approval | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Approval | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);

  const statusValue = listFilters.value("status");
  const entityTypeValue = listFilters.value("entityType");
  const actorIdValue = listFilters.value("actorId");

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useProjectApprovals(
    projectId,
    {
      status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
      entityType:
        entityTypeValue !== BUILD_FILTER_ALL ? entityTypeValue : undefined,
      actorId: actorIdValue !== BUILD_FILTER_ALL ? actorIdValue : undefined,
    },
  );
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);
  const items = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const createApproval = useCreateApproval(projectId);
  const updateApproval = useUpdateApproval(projectId);
  const deleteApproval = useDeleteApproval(projectId);

  const approverOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All approvers" },
      ...members.map((m) => ({
        value: m.userId,
        label: m.name ?? m.email,
      })),
    ],
    [members],
  );

  const memberName = useCallback(
    (membershipId: number | null): string => {
      if (membershipId == null) return "—";
      const m = members.find((x) => x.membershipId === membershipId);
      return m?.name ?? m?.email ?? "Unknown";
    },
    [members],
  );

  const ownerOf = useCallback(
    (membershipId: number | null) => {
      if (membershipId == null) return null;
      const m = members.find((x) => x.membershipId === membershipId);
      return m ? { name: m.name ?? undefined, email: m.email } : null;
    },
    [members],
  );

  const handleOpenRequest = useCallback(
    (preset?: ApprovalEntityType) => {
      setDefaultEntityType(preset);
      setRequestOpen(true);
    },
    [],
  );

  const handleRequestTask = useCallback(
    () => handleOpenRequest("task"),
    [handleOpenRequest],
  );
  const handleRequestRelease = useCallback(
    () => handleOpenRequest("release"),
    [handleOpenRequest],
  );
  const handleRequestMilestone = useCallback(
    () => handleOpenRequest("milestone"),
    [handleOpenRequest],
  );

  const handleOpenFocused = useCallback(
    (index: number) => { if (items[index]) setDecideTarget(items[index]); },
    [items],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: items.length,
    onOpen: handleOpenFocused,
    onCreate: canRequest ? handleOpenRequest : undefined,
    onClearSelection: handleClearKeyboardSelection,
    enabled: !requestOpen && !decideTarget && !delegateTarget && !cancelTarget && !deleteTarget,
  });

  const handleBulkCancel = useCallback(async () => {
    if (isBulkPending || !canManage) return;
    const owner = updateApproval.captureOwner();
    if (!owner) return;
    const selected = items.filter((item) => selectedIds.has(item.id) || selectedIds.has(String(item.id)));
    if (!selected.length) return;
    setIsBulkPending(true);
    try {
      const results = await Promise.allSettled(selected.map((item) => updateApproval.mutateAsync({
        approvalId: item.id, expectedRevision: item.revision, status: "cancelled",
      })));
      const succeeded = selected.filter((_item, index) => results[index]?.status === "fulfilled");
      if (!owner.isCurrent()) return;
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const item of succeeded) { next.delete(item.id); next.delete(String(item.id)); }
        return next;
      });
      if (succeeded.length) toast.success(`${succeeded.length} approval${succeeded.length === 1 ? "" : "s"} cancelled`);
      if (succeeded.length !== selected.length) toast.error("Some approvals could not be cancelled. Review the latest state and try again.");
    } finally { setIsBulkPending(false); }
  }, [selectedIds, items, updateApproval, isBulkPending, canManage]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleCreate = useCallback(
    async (input: CreateApprovalInput) => {
      const owner = createApproval.captureOwner();
      await createApproval.mutateAsync(input);
      if (!owner?.isCurrent()) return;
      toast.success("Approval requested");
      setRequestOpen(false);
    },
    [createApproval],
  );

  const handleDelegate = useCallback(
    (approverId: string) => {
      if (!delegateTarget) return;
      updateApproval.mutate(
        { approvalId: delegateTarget.id, expectedRevision: delegateTarget.revision, approverId },
        {
          onSuccess: () => {
            toast.success("Approval delegated");
            setDelegateTarget(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [delegateTarget, updateApproval],
  );

  const handleEscalate = useCallback(
    (row: Approval) => {
      updateApproval.mutate(
        { approvalId: row.id, expectedRevision: row.revision, status: "escalated" },
        {
          onSuccess: () => toast.success("Approval escalated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateApproval],
  );

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    updateApproval.mutate(
      { approvalId: cancelTarget.id, expectedRevision: cancelTarget.revision, status: "cancelled" },
      {
        onSuccess: () => {
          toast.success("Approval cancelled");
          setCancelTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [cancelTarget, updateApproval]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteApproval.mutate({ approvalId: deleteTarget.id, expectedRevision: deleteTarget.revision }, {
      onSuccess: () => {
        toast.success("Approval deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteApproval]);

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const handleNextPage = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const isRowSelectable = useCallback(() => canManage, [canManage]);

  const handleDecideDialogChange = useCallback((open: boolean) => {
    if (!open) setDecideTarget(null);
  }, []);

  const handleDelegateDialogChange = useCallback((open: boolean) => {
    if (!open) setDelegateTarget(null);
  }, []);

  const handleCancelDialogChange = useCallback((open: boolean) => {
    if (!open) setCancelTarget(null);
  }, []);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleEntityTypeChange = useCallback(
    (value: string) => listFilters.setValue("entityType", value),
    [listFilters],
  );

  const handleActorIdChange = useCallback(
    (value: string) => listFilters.setValue("actorId", value),
    [listFilters],
  );

  const columns = useApprovalsColumns({
    canDecide,
    canManage,
    memberName,
    setDecideTarget,
    setDelegateTarget,
    handleEscalate,
    setCancelTarget,
    setDeleteTarget,
  });

  const renderMobileCard = useCallback(
    (row: Approval) => {
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
          <BuildListSurface<Approval>
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
              cursorVariant: "load-more",
              pageSize: 25,
              pageNumber: data?.pages.length ?? 1,
              hasMore: Boolean(hasNextPage),
              onNext: handleNextPage,
            }}
            isFetchingMore={isFetchingNextPage}
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
                (member) => member.membershipId === delegateTarget.approverMembershipId,
              )?.userId
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
