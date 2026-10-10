import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { usePageState } from "@/hooks/api/use-page-state";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  GOAL_LEVEL_ORDER,
} from "@/features/build/goals/goals-list-shared";
import {
  GOAL_FILTER_DEFINITIONS,
  resolveGoalOutcomeParams,
} from "@/features/build/goals/goals-list-toolbar";

export const PAGE_SIZE = 20;
const PAGE_PARAM = "page";
const CREATE_ACTION = { id: "create", label: "New Goal", icon: Plus, primary: true as const };

function parsePageParam(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

interface UseProductGoalsPageProps {
  managedProductId: number;
}

export function useProductGoalsPage({ managedProductId }: UseProductGoalsPageProps) {
  const isOnline = useOnlineStatus();
  const canManage = useCan("build:goals:manage") && isOnline;
  const listFilters = useBuildListFilters({ filters: GOAL_FILTER_DEFINITIONS });
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [editGoalId, setEditGoalId] = useState<number | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const { data: editGoalDetail } = useGoal(editGoalId ?? 0);
  const deleteGoalMutation = useDeleteGoal();

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

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const page = parsePageParam(searchParams.get(PAGE_PARAM));

  const params = useMemo(
    () => ({
      managedProductId,
      page,
      limit: PAGE_SIZE,
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLevel ? { level: typedLevel } : {}),
      ...(ownerIdValue && ownerIdValue !== BUILD_FILTER_ALL ? { ownerId: ownerIdValue } : {}),
      ...(listFilters.debouncedSearch.trim()
        ? { search: listFilters.debouncedSearch.trim() }
        : {}),
      ...resolveGoalOutcomeParams(readFilterValue),
    }),
    [managedProductId, page, typedStatus, typedLevel, ownerIdValue, listFilters.debouncedSearch, readFilterValue],
  );

  const { data: goalsPage, isLoading, isError, error, refetch, dataUpdatedAt } =
    useGoalsPage(params);
  const goals = useMemo(() => goalsPage?.items ?? [], [goalsPage]);
  const totalGoals = goalsPage?.total ?? 0;
  const { data: stats } = useGoalStats(managedProductId);

  const grouped = useMemo(() => {
    const map = new Map<GoalLevel, GoalListItem[]>();
    for (const level of GOAL_LEVEL_ORDER) map.set(level, []);
    for (const goal of goals) map.get(goal.level)?.push(goal);
    return map;
  }, [goals]);

  const flatGoals = useMemo(() => {
    const result: GoalListItem[] = [];
    for (const level of GOAL_LEVEL_ORDER) {
      for (const g of grouped.get(level) ?? []) result.push(g);
    }
    return result;
  }, [grouped]);

  const resolution = usePageState({
    permission: "build:goals:view",
    isLoading,
    isError,
    error,
    isEmpty: goals.length === 0 && page === 1,
  });

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextPage > 1) next.set(PAGE_PARAM, String(nextPage));
      else next.delete(PAGE_PARAM);
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

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

  const handleEditSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setEditGoalId(null);
  }, []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteGoalId(null);
  }, []);

  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  useBuildListKeyboard({
    itemCount: flatGoals.length,
    onOpen: canManage ? handleEditGoalByIndex : () => undefined,
    onEdit: canManage ? handleEditGoalByIndex : undefined,
    onCreate: handleOpenCreate,
    onClearSelection: () => undefined,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: !createOpen,
  });

  const createActions = useMemo(
    () =>
      resolution.kind !== "denied" && isOnline
        ? [{ ...CREATE_ACTION, onSelect: handleOpenCreate }]
        : [],
    [resolution.kind, handleOpenCreate, isOnline],
  );

  return {
    isOnline,
    canManage,
    listFilters,
    createOpen,
    setCreateOpen,
    searchInputRef,
    editGoalId,
    deleteGoalId,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    editGoalDetail,
    deleteGoalMutation,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    goals,
    totalGoals,
    stats,
    grouped,
    flatGoals,
    resolution,
    page,
    handlePageChange,
    handleOpenCreate,
    handleRetry,
    handleEditGoalCard,
    handleDeleteGoalCard,
    handleDeleteConfirm,
    handleEditSheetOpenChange,
    handleDeleteDialogOpenChange,
    createActions,
  };
}
