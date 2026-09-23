"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";
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
} from "@/components/pm-chrome";

interface ProjectApprovalsPageProps {
  projectId: number;
}

export function ProjectApprovalsPage({ projectId }: ProjectApprovalsPageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const canRequest = useCan("build:approvals:request");
  const canDecide = useCan("build:approvals:decide");
  const canManage = useCan("build:approvals:manage");

  const searchParams = useSearchParams();
  const { setListParams } = useBuildListUrlState();

  const status = searchParams.get("approvalStatus") ?? "all";
  const entityType = searchParams.get("entityType") ?? "all";

  const [requestOpen, setRequestOpen] = useState(false);
  const [defaultEntityType, setDefaultEntityType] = useState<ApprovalEntityType | undefined>(undefined);
  const [decideTarget, setDecideTarget] = useState<Approval | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<Approval | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Approval | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Approval | null>(null);

  const { data, isLoading, isError, error, refetch } = useProjectApprovals(projectId, {
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
      { approvalId: decideTarget.id, ...input },
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
      { approvalId: delegateTarget.id, approverId },
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
      { approvalId: row.id, status: "escalated" },
      {
        onSuccess: () => toast.success("Approval escalated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updateApproval]);

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

  const handleStatusChange = useCallback((value: string) => {
    setListParams({ approvalStatus: value === "all" ? null : value });
  }, [setListParams]);

  const handleEntityTypeChange = useCallback((value: string) => {
    setListParams({ entityType: value === "all" ? null : value });
  }, [setListParams]);

  const handleClearFilters = useCallback(() => {
    setListParams({ approvalStatus: null, entityType: null });
  }, [setListParams]);

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

  const pageState = usePageState({ permission: "build:approvals:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Approvals" subtitle="Review and manage approval requests for this project">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

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
          onStatusChange={handleStatusChange}
          onEntityTypeChange={handleEntityTypeChange}
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
          {isLoading || pageState.kind === "loading" ? (
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
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
              pagination={{ pageSize: 25 }}
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
        currentApproverId={delegateTarget?.requestedById ?? undefined}
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
