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
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DecideDialog } from "./decide-dialog";
import { DelegateDialog } from "./delegate-dialog";
import { RequestApprovalSheet } from "./request-approval-sheet";
import { RequestApprovalMenuButton } from "./approvals-toolbar";
import { ApprovalsFilterBar } from "./approvals-filter-bar";
import { useApprovalsColumns } from "./use-approvals-columns";
import type {
  Approval,
  ApprovalEntityType,
  CreateApprovalInput,
  DecideApprovalInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";

interface ProjectApprovalsPageProps {
  projectId: number;
}

export function ProjectApprovalsPage({ projectId }: ProjectApprovalsPageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const canRequest = useCan("build:approvals:request");
  const canDecide = useCan("build:approvals:decide");
  const canManage = useCan("build:approvals:manage");

  const [status, setStatus] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [requestOpen, setRequestOpen] = useState(false);
  const [defaultEntityType, setDefaultEntityType] = useState<ApprovalEntityType | undefined>(undefined);
  const [decideTarget, setDecideTarget] = useState<Approval | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<Approval | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Approval | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Approval | null>(null);

  const { data, isLoading, isError, refetch } = useProjectApprovals(projectId, {
    status: status === "all" ? undefined : status,
    entityType: entityType === "all" ? undefined : entityType,
  });
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createApproval = useCreateApproval(projectId);
  const decideApproval = useDecideApproval(projectId);
  const updateApproval = useUpdateApproval(projectId);
  const deleteApproval = useDeleteApproval(projectId);

  const memberName = useCallback((userId: string | null): string => {
    if (!userId) return "—";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? "Unknown";
  }, [members]);

  const handleOpenRequest = useCallback((preset?: ApprovalEntityType) => {
    setDefaultEntityType(preset);
    setRequestOpen(true);
  }, []);

  const handleRequestTask = useCallback(() => handleOpenRequest("task"), [handleOpenRequest]);
  const handleRequestRelease = useCallback(() => handleOpenRequest("release"), [handleOpenRequest]);
  const handleRequestMilestone = useCallback(() => handleOpenRequest("milestone"), [handleOpenRequest]);

  const handleCreate = useCallback((input: CreateApprovalInput) => {
    createApproval.mutate(input, {
      onSuccess: () => {
        toast.success("Approval requested");
        setRequestOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [createApproval]);

  const handleDecide = useCallback((input: DecideApprovalInput) => {
    if (!decideTarget) return;
    decideApproval.mutate(
      { id: decideTarget.id, ...input },
      {
        onSuccess: () => {
          toast.success("Decision submitted");
          setDecideTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [decideTarget, decideApproval]);

  const handleDelegate = useCallback((approverId: string) => {
    if (!delegateTarget) return;
    updateApproval.mutate(
      { id: delegateTarget.id, approverId },
      {
        onSuccess: () => {
          toast.success("Approval delegated");
          setDelegateTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [delegateTarget, updateApproval]);

  const handleEscalate = useCallback((row: Approval) => {
    updateApproval.mutate(
      { id: row.id, status: "escalated" },
      {
        onSuccess: () => toast.success("Approval escalated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updateApproval]);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    updateApproval.mutate(
      { id: cancelTarget.id, status: "cancelled" },
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

  const handleClearFilters = useCallback(() => {
    setStatus("all");
    setEntityType("all");
  }, []);

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

  const columns = useApprovalsColumns({
    canDecide,
    canManage,
    currentUserId,
    memberName,
    setDecideTarget,
    setDelegateTarget,
    handleEscalate,
    setCancelTarget,
    setDeleteTarget,
  });

  const items = data ?? [];
  const isFiltered = status !== "all" || entityType !== "all";

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and manage approval requests for this project"
      filters={
        <ApprovalsFilterBar
          status={status}
          entityType={entityType}
          onStatusChange={setStatus}
          onEntityTypeChange={setEntityType}
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
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : items.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="approval"
              title="No approvals yet"
              description={isFiltered ? undefined : "Use approvals to get sign-off on tasks, milestones, and releases before they ship."}
              filtersActive={isFiltered}
              onClearFilters={handleClearFilters}
            />
          ) : (
            <DataTable
              data={items}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="720px"
              className={PM_FILL_PANEL}
            />
          )}
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
        currentApproverId={delegateTarget?.approverId}
      />
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={handleCancelDialogChange}
        title="Cancel this approval?"
        description={cancelTarget?.title
          ? `"${cancelTarget.title}" will be marked cancelled and removed from the approver's inbox.`
          : "The request will be marked cancelled and removed from the approver's inbox."}
        confirmLabel="Cancel approval"
        cancelLabel="Keep"
        onConfirm={handleCancelConfirm}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this approval?"
        description={deleteTarget?.title
          ? `"${deleteTarget.title}" will be permanently deleted.`
          : "This action cannot be undone."}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
