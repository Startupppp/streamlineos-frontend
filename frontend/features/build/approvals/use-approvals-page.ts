import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useCreateApproval,
  useUpdateApproval,
  useDeleteApproval,
} from "@/hooks/api/build/approvals";
import { useCan } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useApprovalsColumns } from "./use-approvals-columns";
import type {
  BuildApprovalsCreateApprovalResponse,
  BuildApprovalsCreateApprovalBody,
} from "@/contracts/build-contracts.generated";
import type { ApprovalEntityType } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { useApprovalsData } from "./use-approvals-data";

export function useApprovalsPage(projectId: number) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const canRequest = useCan("build:approvals:request");
  const canDecide = useCan("build:approvals:decide");
  const canManage = useCan("build:approvals:manage");

  const {
    listFilters,
    statusValue,
    entityTypeValue,
    actorIdValue,
    data,
    isLoading,
    isError,
    error,
    pageNumber,
    hasPrevious,
    hasMore,
    items,
    members,
    approverOptions,
    memberName,
    ownerOf,
    handleStatusChange,
    handleEntityTypeChange,
    handleActorIdChange,
    handleRetry,
    handleNextPage: goNextPage,
    handlePreviousPage: goPreviousPage,
  } = useApprovalsData(projectId);

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [requestOpen, setRequestOpen] = useState(false);
  const [defaultEntityType, setDefaultEntityType] = useState<ApprovalEntityType | undefined>(undefined);
  const [decideTarget, setDecideTarget] = useState<BuildApprovalsCreateApprovalResponse | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<BuildApprovalsCreateApprovalResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BuildApprovalsCreateApprovalResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BuildApprovalsCreateApprovalResponse | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);

  const handleNextPage = useCallback(() => {
    setSelectedIds(new Set());
    goNextPage();
  }, [goNextPage]);
  const handlePreviousPage = useCallback(() => {
    setSelectedIds(new Set());
    goPreviousPage();
  }, [goPreviousPage]);

  const createApproval = useCreateApproval(projectId);
  const updateApproval = useUpdateApproval(projectId);
  const deleteApproval = useDeleteApproval(projectId);

  const handleOpenRequest = useCallback((preset?: ApprovalEntityType) => {
    setDefaultEntityType(preset);
    setRequestOpen(true);
  }, []);
  const handleRequestTask = useCallback(() => handleOpenRequest("task"), [handleOpenRequest]);
  const handleRequestRelease = useCallback(() => handleOpenRequest("release"), [handleOpenRequest]);
  const handleRequestMilestone = useCallback(() => handleOpenRequest("milestone"), [handleOpenRequest]);

  const handleOpenFocused = useCallback(
    (index: number) => { if (items[index]) setDecideTarget(items[index]); },
    [items],
  );
  useBuildListKeyboard({
    itemCount: items.length,
    onOpen: handleOpenFocused,
    onCreate: canRequest ? handleOpenRequest : undefined,
    onClearSelection: useCallback(() => {}, []),
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
      const results = await Promise.allSettled(
        selected.map((item) => updateApproval.mutateAsync({ approvalId: item.id, expectedRevision: item.revision, status: "cancelled" })),
      );
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

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleCreate = useCallback(async (input: BuildApprovalsCreateApprovalBody) => {
    const owner = createApproval.captureOwner();
    await createApproval.mutateAsync(input);
    if (!owner?.isCurrent()) return;
    toast.success("Approval requested");
    setRequestOpen(false);
  }, [createApproval]);

  const handleDelegate = useCallback((approverId: string) => {
    if (!delegateTarget) return;
    updateApproval.mutate(
      { approvalId: delegateTarget.id, expectedRevision: delegateTarget.revision, approverId },
      {
        onSuccess: () => { toast.success("Approval delegated"); setDelegateTarget(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [delegateTarget, updateApproval]);

  const handleEscalate = useCallback((row: BuildApprovalsCreateApprovalResponse) => {
    updateApproval.mutate(
      { approvalId: row.id, expectedRevision: row.revision, status: "escalated" },
      { onSuccess: () => toast.success("Approval escalated"), onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [updateApproval]);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    updateApproval.mutate(
      { approvalId: cancelTarget.id, expectedRevision: cancelTarget.revision, status: "cancelled" },
      {
        onSuccess: () => { toast.success("Approval cancelled"); setCancelTarget(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [cancelTarget, updateApproval]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteApproval.mutate(
      { approvalId: deleteTarget.id, expectedRevision: deleteTarget.revision },
      {
        onSuccess: () => { toast.success("Approval deleted"); setDeleteTarget(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteTarget, deleteApproval]);

  const isRowSelectable = useCallback(() => canManage, [canManage]);
  const handleDecideDialogChange = useCallback((open: boolean) => { if (!open) setDecideTarget(null); }, []);
  const handleDelegateDialogChange = useCallback((open: boolean) => { if (!open) setDelegateTarget(null); }, []);
  const handleCancelDialogChange = useCallback((open: boolean) => { if (!open) setCancelTarget(null); }, []);
  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteTarget(null); }, []);

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

  return {
    currentUserId,
    canRequest,
    canManage,
    listFilters,
    statusValue,
    entityTypeValue,
    actorIdValue,
    approverOptions,
    data,
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
  };
}
