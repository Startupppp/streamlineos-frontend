import { useCallback, useMemo, useState } from "react";
import {
  useChangeRequests,
  useDeleteChangeRequest,
  useUpdateChangeRequest,
} from "@/hooks/api/build/change-requests";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import type { ChangeRequest } from "@/types/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { CR_STATUSES } from "./change-request-schema";
import { buildChangeRequestsColumns } from "./change-requests-table-columns";

const FILTER_DEFINITIONS = [
  { param: "status", options: CR_STATUSES },
  { param: "clientVisible", options: ["true", "false"] as const },
  { param: "impact" },
  { param: "requesterId" },
  { param: "approverId" },
  { param: "releaseId" },
] as const;

const PAGE_SIZE = 25;

export function useChangeRequestsPage(projectId: number) {
  const canCreate = useCan("build:changerequests:create");
  const canManage = useCan("build:changerequests:manage");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCr, setEditCr] = useState<ChangeRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangeRequest | null>(null);
  const [selectedCrIds, setSelectedCrIds] = useState<Set<string | number>>(
    new Set(),
  );

  const statusValue = listFilters.value("status");
  const clientVisibleValue = listFilters.value("clientVisible");
  const impactValue = listFilters.value("impact");
  const requesterIdValue = listFilters.value("requesterId");
  const approverIdValue = listFilters.value("approverId");
  const releaseIdValue = listFilters.value("releaseId");

  const {
    data: crPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useChangeRequests(projectId, {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    clientVisible:
      clientVisibleValue !== BUILD_FILTER_ALL
        ? clientVisibleValue === "true"
        : undefined,
    impact:
      impactValue !== BUILD_FILTER_ALL && impactValue ? impactValue : undefined,
    requesterId:
      requesterIdValue !== BUILD_FILTER_ALL ? requesterIdValue : undefined,
    approverId:
      approverIdValue !== BUILD_FILTER_ALL ? approverIdValue : undefined,
    releaseId:
      releaseIdValue !== BUILD_FILTER_ALL && releaseIdValue
        ? Number(releaseIdValue)
        : undefined,
    q: listFilters.debouncedSearch || undefined,
    cursor: cursor ?? undefined,
    limit: PAGE_SIZE,
  });

  const { data: membersData } = useOrgMembers(1, 100);
  const deleteCr = useDeleteChangeRequest(projectId);
  const members = useMemo(() => membersData?.data ?? [], [membersData]);
  const updateCr = useUpdateChangeRequest(projectId);

  const crs = useMemo(() => crPage?.data ?? [], [crPage]);
  const pagination = crPage?.pagination;

  const handleNew = useCallback(() => {
    setEditCr(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((cr: ChangeRequest) => {
    setEditCr(cr);
    setSheetOpen(true);
  }, []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCr.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Change request deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteCr]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const cr = crs[index];
      if (cr) handleEdit(cr);
    },
    [crs, handleEdit],
  );

  const handleKeyboardClear = useCallback(
    () => setSelectedCrIds(new Set()),
    [],
  );

  useBuildListKeyboard({
    itemCount: crs.length,
    onOpen: handleKeyboardOpen,
    onCreate: canCreate ? handleNew : undefined,
    onEdit: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    enabled: !isLoading && !isError && crs.length > 0,
  });

  const handleBulkStatusChange = useCallback(
    (newStatus: string) => {
      const status = CR_STATUSES.find((s) => s === newStatus);
      if (!status) return;
      selectedCrIds.forEach((idStr) => {
        updateCr.mutate({ changeRequestId: Number(idStr), status });
      });
      setSelectedCrIds(new Set());
    },
    [selectedCrIds, updateCr],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleClientVisibleChange = useCallback(
    (value: string) => listFilters.setValue("clientVisible", value),
    [listFilters],
  );

  const handleImpactChange = useCallback(
    (value: string) =>
      listFilters.setValue("impact", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const handleNextPage = useCallback(() => {
    goNext(pagination?.nextCursor);
  }, [pagination, goNext]);

  const columns = useMemo(
    () =>
      buildChangeRequestsColumns({
        canManage,
        members,
        onEdit: handleEdit,
        onDelete: setDeleteTarget,
      }),
    [canManage, members, handleEdit],
  );

  return {
    canCreate,
    canManage,
    listFilters,
    pageNumber,
    hasPrevious,
    goPrevious,
    sheetOpen,
    setSheetOpen,
    editCr,
    deleteTarget,
    setDeleteTarget,
    selectedCrIds,
    setSelectedCrIds,
    statusValue,
    clientVisibleValue,
    impactValue,
    crs,
    pagination,
    isLoading,
    isError,
    error,
    deleteCrIsPending: deleteCr.isPending,
    members,
    handleNew,
    handleEdit,
    handleAlertOpenChange,
    handleDelete,
    handleRetry,
    handleKeyboardClear,
    handleBulkStatusChange,
    handleStatusChange,
    handleClientVisibleChange,
    handleImpactChange,
    handleNextPage,
    columns,
  };
}
