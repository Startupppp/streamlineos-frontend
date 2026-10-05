"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useProjectRisks,
  useProjectRiskStats,
} from "@/hooks/api/build/governance";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCan } from "@/hooks/api/access";
import type { RiskProbability, RiskImpact } from "@/types/projects";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { FILTER_DEFINITIONS } from "./risks-filter-options";
import { useRisksMutations } from "./use-risks-mutations";
import { useRisksBulk } from "./use-risks-bulk";
import { buildRiskColumns } from "./risks-table-columns";

export function useRisksPage(projectId: number) {
  const canManage = useCan("build:risks:manage");
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const [matrixCell, setMatrixCell] = useState<{
    probability: RiskProbability;
    impact: RiskImpact;
  } | null>(null);

  const { cursor, pageNumber, hasPrevious, goNext, goPrevious } = useBuildCursorPager(
    listFilters.resetKey,
  );

  const statusValue = listFilters.value("status");
  const probabilityValue = listFilters.value("probability");
  const impactValue = listFilters.value("impact");

  const { data, isLoading, isError, error, refetch } = useProjectRisks(projectId, {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    probability: probabilityValue !== BUILD_FILTER_ALL ? probabilityValue : undefined,
    impact: impactValue !== BUILD_FILTER_ALL ? impactValue : undefined,
    cursor: cursor === undefined ? undefined : Number(cursor),
    search: listFilters.debouncedSearch || undefined,
  });
  const { data: stats, isLoading: isStatsLoading } = useProjectRiskStats(projectId);

  const { data: membersPage } = useProjectMembers(projectId);
  const members = membersPage?.data ?? [];

  const {
    sheetOpen,
    editRisk,
    deleteTarget,
    riskFieldErrors,
    createRisk,
    updateRisk,
    handleCreate,
    handleUpdate,
    handleDeleteConfirm,
    handleSheetOpenChange,
    handleAlertOpenChange,
    handleEditRow,
    handleDeleteRow,
    handleNewRisk,
  } = useRisksMutations(projectId);

  const memberName = useCallback(
    (userId: string | null): string => {
      if (!userId) return "—";
      const m = members.find((x) => x.id === userId);
      return getUserDisplayName(m) || userId;
    },
    [members],
  );

  const ownerOf = useCallback(
    (userId: string | null): NamedUser | null => {
      if (!userId) return null;
      const m = members.find((x) => x.id === userId);
      return m ? { name: m.name ?? undefined, email: m.email } : null;
    },
    [members],
  );

  const filteredRisks = useMemo(() => data?.data ?? [], [data]);

  const {
    selectedIds,
    setSelectedIds,
    handleBulkStatus,
    handleBulkOwner,
    handleBulkClear,
  } = useRisksBulk(filteredRisks, updateRisk.mutate);

  const isFiltered = listFilters.isFiltered || !!matrixCell;

  const displayed = useMemo(() => {
    if (!matrixCell) return filteredRisks;
    return filteredRisks.filter(
      (r) => r.probability === matrixCell.probability && r.impact === matrixCell.impact,
    );
  }, [filteredRisks, matrixCell]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleProbabilityChange = useCallback(
    (value: string) => listFilters.setValue("probability", value),
    [listFilters],
  );
  const handleImpactChange = useCallback(
    (value: string) => listFilters.setValue("impact", value),
    [listFilters],
  );
  const handleClearAll = useCallback(() => {
    listFilters.clearAll();
    setMatrixCell(null);
  }, [listFilters]);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleNextPage = useCallback(
    () => goNext(data?.nextCursor == null ? null : String(data.nextCursor)),
    [goNext, data],
  );
  const handleCellClick = useCallback(
    (probability: RiskProbability, impact: RiskImpact) => {
      setMatrixCell((prev) =>
        prev?.probability === probability && prev?.impact === impact
          ? null
          : { probability, impact },
      );
    },
    [],
  );

  const handleEditRiskByIndex = useCallback(
    (index: number) => { if (filteredRisks[index]) handleEditRow(filteredRisks[index]); },
    [filteredRisks, handleEditRow],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: filteredRisks.length,
    onOpen: handleEditRiskByIndex,
    onEdit: canManage ? handleEditRiskByIndex : undefined,
    onCreate: canManage ? handleNewRisk : undefined,
    onClearSelection: handleClearKeyboardSelection,
    enabled: !sheetOpen && !editRisk && !deleteTarget,
  });

  const columns = useMemo(
    () => buildRiskColumns({ canManage, memberName, ownerOf, onEdit: handleEditRow, onDelete: handleDeleteRow }),
    [canManage, memberName, ownerOf, handleEditRow, handleDeleteRow],
  );

  return {
    canManage,
    listFilters,
    statusValue,
    probabilityValue,
    impactValue,
    matrixCell,
    sheetOpen,
    editRisk,
    deleteTarget,
    data,
    isLoading,
    isError,
    error,
    stats,
    isStatsLoading,
    members,
    createRisk,
    updateRisk,
    riskFieldErrors,
    handleCreate,
    handleUpdate,
    handleDeleteConfirm,
    displayed,
    isFiltered,
    selectedIds,
    setSelectedIds,
    handleBulkStatus,
    handleBulkOwner,
    handleBulkClear,
    openCount: stats?.open ?? 0,
    highCritCount: stats?.highCritical ?? 0,
    closedCount: stats?.closed ?? 0,
    columns,
    pageNumber,
    hasPrevious,
    goPrevious,
    handleStatusChange,
    handleProbabilityChange,
    handleImpactChange,
    handleNewRisk,
    handleClearAll,
    handleRetry,
    handleNextPage,
    handleAlertOpenChange,
    handleSheetOpenChange,
    handleCellClick,
    handleEditRow,
    handleDeleteRow,
    ownerOf,
  };
}
