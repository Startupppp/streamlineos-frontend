import { useCallback, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { getUserDisplayName } from "@/lib/person-display";
import { formatRelativeTime } from "@/lib/date-utils";
import type { SummaryPeriod } from "@/hooks/api/build/managed-product-summary";

const PERIOD_VALUES = ["30d", "90d", "365d", "all"] as const;

const OVERVIEW_FILTER_DEFINITIONS = [
  { param: "period", options: PERIOD_VALUES },
] as const;

export const PERIOD_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 365 days" },
];

const EDIT_ACTION_BASE = { id: "edit", label: "Edit product", icon: Pencil, primary: true as const };

export function useManagedProductOverview(managedProductId: number) {
  const [editOpen, setEditOpen] = useState(false);
  const listFilters = useBuildListFilters({ filters: OVERVIEW_FILTER_DEFINITIONS });
  const rawPeriod = listFilters.value("period");
  const period: SummaryPeriod | undefined = PERIOD_VALUES.find((v) => v === rawPeriod);
  const isOnline = useOnlineStatus();
  const canEdit = useCan("build:managed-products:update") && isOnline;

  const summaryQuery = useManagedProductSummary(managedProductId, period);

  const product = summaryQuery.data?.product ?? null;

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading: summaryQuery.isLoading,
    isError: summaryQuery.isError,
    error: summaryQuery.error,
    isEmpty: !summaryQuery.data,
  });

  const handleRetry = useCallback(() => {
    void summaryQuery.refetch();
  }, [summaryQuery]);

  const handlePeriodChange = useCallback(
    (value: string) => listFilters.setValue("period", value),
    [listFilters],
  );

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);

  const editActions = useMemo(
    () => (canEdit && !!product ? [{ ...EDIT_ACTION_BASE, onSelect: handleOpenEdit }] : []),
    [canEdit, product, handleOpenEdit],
  );

  const overviewSubtitle = useMemo(() => {
    if (!product) return undefined;
    const parts: string[] = [];
    if (product.lifecycle) parts.push(product.lifecycle);
    if (product.health) parts.push(product.health);
    parts.push(`Owner ${getUserDisplayName(product.owner)}`);
    if (product.lastReviewedAt) {
      parts.push(`Reviewed ${formatRelativeTime(product.lastReviewedAt)}`);
    }
    return parts.join(" · ");
  }, [product]);

  return {
    listFilters,
    rawPeriod,
    product,
    editOpen,
    setEditOpen,
    resolution,
    editActions,
    summaryData: summaryQuery.data ?? null,
    summaryDataUpdatedAt: summaryQuery.dataUpdatedAt,
    overviewSubtitle,
    handleRetry,
    handlePeriodChange,
  };
}
