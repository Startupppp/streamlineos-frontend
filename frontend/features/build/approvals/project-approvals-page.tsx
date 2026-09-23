"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useProjectApprovals,
  useCreateApproval,
  useDecideApproval,
  useUpdateApproval,
  useDeleteApproval,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DecideDialog } from "./decide-dialog";
import { DelegateDialog } from "./delegate-dialog";
import { RequestApprovalSheet } from "./request-approval-sheet";
import { RequestApprovalMenuButton } from "./approvals-toolbar";
import { ApprovalsFilterBar } from "./approvals-filter-bar";
import { useApprovalsColumns } from "./use-approvals-columns";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { STATUS_OPTIONS, ENTITY_OPTIONS } from "./approvals-constants";
import type {
  Approval,
  ApprovalEntityType,
  ApprovalStatus,
  CreateApprovalInput,
  DecideApprovalInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";

const APPROVALS_TABLE_HEADERS = [
  "Type",
  "Title",
  "Approver",
  "Level",
  "Due",
  "Status",
  "Actions",
] as const;

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

  const [requestOpen, setRequestOpen] = useState(false);
  const [defaultEntityType, setDefaultEntityType] = useState<
    ApprovalEntityType | undefined
  >(undefined);
  const [decideTarget, setDecideTarget] = useState<Approval | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<Approval | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Approval | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Approval | null>(null);

  const statusValue = listFilters.value("status");
  const entityTypeValue = listFilters.value("entityType");

  const { data, isLoading, isError, error, refetch } = useProjectApprovals(
    projectId,
    {
      status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
      entityType:
        entityTypeValue !== BUILD_FILTER_ALL ? entityTypeValue : undefined,
    },
  );
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createApproval = useCreateApproval(projectId);
  const decideApproval = useDecideApproval(projectId);
  const updateApproval = useUpdateApproval(projectId);
  const deleteApproval = useDeleteApproval(projectId);

  const memberName = useCallback(
    (userId: string | null): string => {
      if (!userId) return "—";
      const m = members.find((x) => x.userId === userId);
      return m?.name ?? m?.email ?? "Unknown";
    },
    [members],
  );

  const ownerOf = useCallback(
    (userId: string | null) => {
      if (!userId) return null;
      const m = members.find((x) => x.userId === userId);
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

  const handleCreate = useCallback(
    (input: CreateApprovalInput) => {
      createApproval.mutate(input, {
        onSuccess: () => {
          toast.success("Approval requested");
          setRequestOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createApproval],
  );

  const handleDecide = useCallback(
    (input: DecideApprovalInput) => {
      if (!decideTarget) return;
      decideApproval.mutate(
        { approvalId: decideTarget.id, ...input },
        {
          onSuccess: () => {
            toast.success("Decision submitted");
            setDecideTarget(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [decideTarget, decideApproval],
  );

  const handleDelegate = useCallback(
    (approverId: string) => {
      if (!delegateTarget) return;
      updateApproval.mutate(
        { approvalId: delegateTarget.id, approverId },
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
        { approvalId: row.id, status: "escalated" },
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
      { approvalId: cancelTarget.id, status: "cancelled" },
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
    deleteApproval.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Approval deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteApproval]);

  const handleRetry = useCallback(() => void refetch(), [refetch]);

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
          person={{ user: ownerOf(row.requestedById), role: "Approver" }}
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

  const pageState = usePageState({
    permission: "build:approvals:view",
    isLoading,
    isError,
    error,
  });

  const items = data ?? [];

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and manage approval requests for this project"
      filters={
        <ApprovalsFilterBar
          statusValue={statusValue}
          entityTypeValue={entityTypeValue}
          isStatusActive={listFilters.isActive("status")}
          isEntityTypeActive={listFilters.isActive("entityType")}
          onStatusChange={handleStatusChange}
          onEntityTypeChange={handleEntityTypeChange}
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
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton mobileCards
                rows={12}
                headers={APPROVALS_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals yet"
                description="Use approvals to get sign-off on tasks, milestones, and releases before they ship."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={items}
              columns={columns}
              getRowKey={(row) => row.id}
              pagination={{ pageSize: 25 }}
              minWidth="720px"
              mobileCard={renderMobileCard}
              className={PM_FILL_PANEL}
            />
          </PageState>
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
        onConfirm={handleDecide}
        isPending={decideApproval.isPending}
        approvalTitle={decideTarget?.title}
      />
      <DelegateDialog
        open={!!delegateTarget}
        onOpenChange={handleDelegateDialogChange}
        onConfirm={handleDelegate}
        isPending={updateApproval.isPending}
        members={members}
        currentApproverId={delegateTarget?.requestedById ?? undefined}
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
