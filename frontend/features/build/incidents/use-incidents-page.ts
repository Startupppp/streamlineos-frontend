import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useIncidents } from "@/hooks/api/build/incidents";
import { useDeleteIncident } from "@/hooks/api/build/incident-mutations";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  buildIncidentsColumns,
} from "./incidents-table-columns";
import { getSlaState } from "./sla";
import type { IncidentsCreateIncidentResponse } from "@/contracts/build-contracts.generated";
import { getErrorMessage } from "@/lib/get-error-message";

const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: [
      "detected",
      "investigating",
      "mitigating",
      "resolved",
      "postmortem",
      "closed",
    ] as const,
  },
  {
    param: "severity",
    options: ["critical", "high", "medium", "low"] as const,
  },
] as const;

interface UseIncidentsPageProps {
  projectId: number;
}

export function useIncidentsPage({ projectId }: UseIncidentsPageProps) {
  const router = useRouter();
  const canManage = useCan("build:incidents:manage");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<IncidentsCreateIncidentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncidentsCreateIncidentResponse | null>(null);

  const statusValue = listFilters.value("status");
  const severityValue = listFilters.value("severity");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useIncidents(projectId, {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    severity: severityValue !== BUILD_FILTER_ALL ? severityValue : undefined,
    q: listFilters.debouncedSearch.trim() || undefined,
  });

  const { data: membersData } = useOrgMembers(1, 100);
  const deleteIncident = useDeleteIncident();
  const members = useMemo(() => membersData?.data ?? [], [membersData]);

  const all = useMemo(
    () =>
      Array.isArray(data)
        ? data
        : (data?.pages.flatMap((page) => page.data) ?? []),
    [data],
  );

  const openCount = all.filter(
    (i) => i.status !== "resolved" && i.status !== "closed",
  ).length;
  const slaBreachedCount = all.filter((i) => {
    const s = getSlaState(i);
    return s.responseBreached || s.resolutionBreached;
  }).length;
  const resolvedCount = all.filter(
    (i) => i.status === "resolved" || i.status === "closed",
  ).length;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEdit = useCallback((inc: IncidentsCreateIncidentResponse) => {
    setEditIncident(inc);
    setSheetOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditIncident(null);
    setSheetOpen(true);
  }, []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteIncident.mutate(
      { projectId, incidentId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Incident deleted");
          setDeleteTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteTarget, deleteIncident, projectId]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleSeverityChange = useCallback(
    (value: string) => listFilters.setValue("severity", value),
    [listFilters],
  );

  const handleNextPage = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const handleOpenFocused = useCallback(
    (index: number) => { router.push(`/build/${projectId}/incidents/${all[index].id}`); },
    [all, projectId, router],
  );
  const handleEditByIndex = useCallback(
    (index: number) => { if (all[index]) handleEdit(all[index]); },
    [all, handleEdit],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: all.length,
    onOpen: handleOpenFocused,
    onEdit: canManage ? handleEditByIndex : undefined,
    onCreate: canManage ? handleNew : undefined,
    onClearSelection: handleClearKeyboardSelection,
    enabled: !sheetOpen && !deleteTarget,
  });

  const columns = useMemo(
    () =>
      buildIncidentsColumns({
        canManage,
        members,
        projectId,
        onEdit: handleEdit,
        onDelete: setDeleteTarget,
      }),
    [canManage, members, projectId, handleEdit],
  );

  return {
    canManage,
    listFilters,
    sheetOpen,
    setSheetOpen,
    editIncident,
    deleteTarget,
    setDeleteTarget,
    statusValue,
    severityValue,
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    members,
    all,
    openCount,
    slaBreachedCount,
    resolvedCount,
    columns,
    handleRetry,
    handleEdit,
    handleNew,
    handleAlertOpenChange,
    handleDeleteConfirm,
    handleStatusChange,
    handleSeverityChange,
    handleNextPage,
  };
}
