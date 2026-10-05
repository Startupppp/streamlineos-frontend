"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import {
  useGoal,
  useGoalsPage,
  useGoalStats,
  useDeleteGoal,
  type GoalListItem,
  type GoalLevel,
} from "@/hooks/api/goals";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  LEVEL_OPTIONS,
  STATUS_OPTIONS,
} from "@/features/build/goals/constants";
import {
  GOAL_LEVEL_ORDER,
} from "@/features/build/goals/goals-list-shared";
import {
  GOAL_FILTER_DEFINITIONS,
  resolveGoalOutcomeParams,
} from "@/features/build/goals/goals-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { usePageState } from "@/hooks/api/use-page-state";

const CREATE_ACTION_BASE = { id: "create", label: "New Goal", icon: Plus, primary: true as const };
const GOALS_PAGE_SIZE = 24;

export { GOALS_PAGE_SIZE };

export function useGoalsPageData() {
  const canManage = useCan("build:goals:manage");
  const listFilters = useBuildListFilters({ filters: GOAL_FILTER_DEFINITIONS });
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");

  const [editGoalId, setEditGoalId] = useState<number | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const { data: editGoalDetail } = useGoal(editGoalId ?? 0);
  const deleteGoalMutation = useDeleteGoal();

  const [page, setPage] = useState(1);
  const [prevResetKey, setPrevResetKey] = useState(listFilters.resetKey);
  if (prevResetKey !== listFilters.resetKey) {
    setPrevResetKey(listFilters.resetKey);
    setPage(1);
  }

  const levelValue = listFilters.value("level");
  const statusValue = listFilters.value("status");
  const ownerIdValue = listFilters.value("ownerId");
  const readFilterValue = listFilters.value;

  const typedLevel = useMemo(
    () => LEVEL_OPTIONS.find((o) => o.value === levelValue)?.value,
    [levelValue],
  );

  const typedStatus = useMemo(
    () => STATUS_OPTIONS.find((o) => o.value === statusValue)?.value,
    [statusValue],
  );

  const params = useMemo(
    () => ({
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLevel ? { level: typedLevel } : {}),
      ...(ownerIdValue !== "all" && ownerIdValue ? { ownerId: ownerIdValue } : {}),
      ...(listFilters.debouncedSearch.trim()
        ? { search: listFilters.debouncedSearch.trim() }
        : {}),
      ...resolveGoalOutcomeParams(readFilterValue),
      page,
      limit: GOALS_PAGE_SIZE,
    }),
    [typedStatus, typedLevel, ownerIdValue, listFilters.debouncedSearch, page, readFilterValue],
  );

  const { data: goalsPage, isLoading, isError, error, refetch } = useGoalsPage(params);
  const goals = goalsPage?.items ?? null;
  const totalGoals = goalsPage?.total ?? 0;
  const { data: stats } = useGoalStats();

  const ownerOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: { value: string; label: string }[] = [];
    for (const goal of goals ?? []) {
      if (goal.owner && !seen.has(goal.owner.id)) {
        seen.add(goal.owner.id);
        result.push({ value: goal.owner.id, label: goal.owner.name ?? goal.owner.email });
      }
    }
    return result;
  }, [goals]);

  const grouped = useMemo(() => {
    const map = new Map<GoalLevel, GoalListItem[]>();
    for (const level of GOAL_LEVEL_ORDER) map.set(level, []);
    for (const goal of goals ?? []) map.get(goal.level)?.push(goal);
    return map;
  }, [goals]);

  const hasGoals = (goals?.length ?? 0) > 0;

  const flatGoals = useMemo(() => {
    const result: GoalListItem[] = [];
    for (const level of GOAL_LEVEL_ORDER) {
      for (const g of grouped.get(level) ?? []) result.push(g);
    }
    return result;
  }, [grouped]);

  const handleOpenCreate = useCallback(() => { openCreate(); }, [openCreate]);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleEditGoalByIndex = useCallback(
    (index: number) => {
      const goal = flatGoals[index];
      if (goal && canManage) setEditGoalId(goal.id);
    },
    [flatGoals, canManage],
  );

  const handleEditGoalCard = useCallback(
    (goal: GoalListItem) => { if (canManage) setEditGoalId(goal.id); },
    [canManage],
  );

  const handleDeleteGoalCard = useCallback(
    (goal: GoalListItem) => { if (canManage) setDeleteGoalId(goal.id); },
    [canManage],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteGoalId) return;
    deleteGoalMutation.mutate(deleteGoalId, {
      onSuccess: () => {
        toast.success("Goal deleted");
        setDeleteGoalId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteGoalMutation, deleteGoalId]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleClearSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: flatGoals.length,
    onOpen: handleEditGoalByIndex,
    onEdit: handleEditGoalByIndex,
    onCreate: handleOpenCreate,
    onClearSelection: handleClearSelection,
    searchInputRef,
  });

  const pageState = usePageState({
    permission: "build:goals:view",
    isLoading,
    isError,
    error,
    isEmpty: !hasGoals,
  });

  const createActions = useMemo(
    () =>
      canManage
        ? [{ ...CREATE_ACTION_BASE, onSelect: handleOpenCreate }]
        : [],
    [canManage, handleOpenCreate],
  );

  return {
    canManage,
    createOpen,
    setCreateOpen,
    editGoalId,
    setEditGoalId,
    deleteGoalId,
    setDeleteGoalId,
    editGoalDetail,
    deleteGoalMutation,
    page,
    setPage,
    listFilters,
    goals,
    totalGoals,
    stats,
    ownerOptions,
    grouped,
    flatGoals,
    isLoading,
    pageState,
    createActions,
    searchInputRef,
    handleOpenCreate,
    handleRetry,
    handleEditGoalCard,
    handleDeleteGoalCard,
    handleDeleteConfirm,
  };
}
