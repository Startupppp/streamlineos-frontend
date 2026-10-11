import { useCallback, useMemo, useState } from "react";
import { CalendarCheck, Lightbulb, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { useUpdateManagedProduct } from "@/hooks/api/build/managed-product-mutations";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { getUserDisplayName } from "@/lib/person-display";
import { formatRelativeTime } from "@/lib/date-utils";
import type { SummaryPeriod, InitiativeStatus } from "@/hooks/api/build/managed-product-summary";

const PERIOD_VALUES = ["30d", "90d", "365d", "all"] as const;
const INITIATIVE_STATUS_VALUES = ["planned", "in_progress", "completed", "cancelled"] as const;

const OVERVIEW_FILTER_DEFINITIONS = [
  { param: "period", options: PERIOD_VALUES },
  { param: "teamId" },
  { param: "segment" },
  { param: "initiativeStatus", options: INITIATIVE_STATUS_VALUES },
] as const;

export const PERIOD_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 365 days" },
];

export const INITIATIVE_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const CREATE_ACTION_BASE = {
  id: "record-opportunity",
  label: "Record opportunity",
  icon: Lightbulb,
  primary: true as const,
};
const EDIT_ACTION_BASE = { id: "edit", label: "Edit product", icon: Pencil };
const REVIEW_ACTION_BASE = {
  id: "mark-reviewed",
  label: "Mark reviewed",
  loadingLabel: "Saving…",
  icon: CalendarCheck,
};

function positiveTeamId(value: string | undefined): number | undefined {
  if (!value || value === BUILD_FILTER_ALL || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function activeSegment(value: string | undefined): string | undefined {
  if (!value || value === BUILD_FILTER_ALL) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readableToken(value: string): string {
  return value.replaceAll("_", " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function useManagedProductOverview(managedProductId: number) {
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const listFilters = useBuildListFilters({ filters: OVERVIEW_FILTER_DEFINITIONS });
  const rawPeriod = listFilters.value("period");
  const rawTeamId = listFilters.value("teamId");
  const rawSegment = listFilters.value("segment");
  const rawInitiativeStatus = listFilters.value("initiativeStatus");

  const period: SummaryPeriod | undefined = PERIOD_VALUES.find((v) => v === rawPeriod);
  const initiativeStatus: InitiativeStatus | undefined = INITIATIVE_STATUS_VALUES.find(
    (v) => v === rawInitiativeStatus,
  );
  const teamIdNum = positiveTeamId(rawTeamId);
  const segment = activeSegment(rawSegment);

  const isOnline = useOnlineStatus();
  const canEdit = useCan("build:managed-products:update") && isOnline;

  const { data: teamsRes } = useProjectTeams({ pageSize: 100 });
  const teams = useMemo(() => teamsRes?.data ?? [], [teamsRes]);
  const teamOptions = useMemo(() => {
    const options = [
      { value: BUILD_FILTER_ALL, label: "All teams" },
      ...teams.map((t) => ({ value: String(t.id), label: t.name })),
    ];
    if (teamIdNum !== undefined && !options.some((option) => option.value === String(teamIdNum))) {
      options.push({ value: String(teamIdNum), label: `Team ${teamIdNum}` });
    }
    return options;
  }, [teams, teamIdNum]);

  const summaryQuery = useManagedProductSummary(managedProductId, {
    period,
    teamId: teamIdNum,
    segment,
    initiativeStatus,
  });

  const product = summaryQuery.data?.product ?? null;

  const segmentOptions = useMemo(() => {
    const options = [
      { value: BUILD_FILTER_ALL, label: "All segments" },
      ...(product?.segments ?? []).map((s) => ({ value: s, label: s })),
    ];
    if (segment && !options.some((option) => option.value === segment)) {
      options.push({ value: segment, label: segment });
    }
    return options;
  }, [product, segment]);

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

  const handleTeamChange = useCallback(
    (value: string) => listFilters.setValue("teamId", value),
    [listFilters],
  );

  const handleInitiativeStatusChange = useCallback(
    (value: string) => listFilters.setValue("initiativeStatus", value),
    [listFilters],
  );

  const handleSegmentChange = useCallback(
    (value: string) => listFilters.setValue("segment", value),
    [listFilters],
  );

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const updateProduct = useUpdateManagedProduct();
  const { mutate: mutateProduct, isPending: isMarkingReviewed } = updateProduct;
  const handleMarkReviewed = useCallback(() => {
    if (!product) return;
    mutateProduct(
      { managedProductId, version: product.version, lastReviewedAt: new Date().toISOString() },
      {
        onSuccess: () => toast.success(`Marked ${product.name} as reviewed today`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [managedProductId, mutateProduct, product]);

  const editActions = useMemo(
    () =>
      canEdit && !!product
        ? [
            { ...CREATE_ACTION_BASE, onSelect: handleOpenCreate },
            { ...REVIEW_ACTION_BASE, onSelect: handleMarkReviewed, isPending: isMarkingReviewed },
            { ...EDIT_ACTION_BASE, onSelect: handleOpenEdit },
          ]
        : [],
    [canEdit, product, handleOpenCreate, handleMarkReviewed, isMarkingReviewed, handleOpenEdit],
  );

  const overviewSubtitle = useMemo(() => {
    if (!product) return undefined;
    const parts: string[] = [`${readableToken(product.lifecycle)} stage`];
    parts.push(`Owner ${getUserDisplayName(product.owner)}`);
    parts.push(
      product.lastReviewedAt
        ? `Reviewed ${formatRelativeTime(product.lastReviewedAt)}`
        : "Never reviewed",
    );
    return parts.join(" · ");
  }, [product]);

  const now = useMemo(() => new Date(summaryQuery.dataUpdatedAt), [summaryQuery.dataUpdatedAt]);

  return {
    listFilters,
    rawPeriod,
    rawTeamId,
    rawSegment,
    product,
    editOpen,
    setEditOpen,
    createOpen,
    setCreateOpen,
    resolution,
    editActions,
    summaryData: summaryQuery.data ?? null,
    summaryDataUpdatedAt: summaryQuery.dataUpdatedAt,
    overviewSubtitle,
    now,
    markReviewed: canEdit && !!product ? handleMarkReviewed : undefined,
    isMarkingReviewed,
    teamOptions,
    segmentOptions,
    teamSelectValue: teamIdNum !== undefined ? String(teamIdNum) : BUILD_FILTER_ALL,
    segmentSelectValue: segment ?? BUILD_FILTER_ALL,
    handleRetry,
    handlePeriodChange,
    handleTeamChange,
    handleInitiativeStatusChange,
    handleSegmentChange,
  };
}
