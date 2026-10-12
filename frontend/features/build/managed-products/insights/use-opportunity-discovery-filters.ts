"use client";

import { useCallback, useMemo } from "react";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { useFeedbucketSubmissionFacets } from "@/hooks/api/feedbucket";
import { useOrgMembers } from "@/hooks/api/organization";
import { useEvidenceThemes } from "@/hooks/api/build/product-discovery";
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const OPPORTUNITY_STATE_VALUES = [
  "all",
  "identified",
  "validating",
  "accepted",
  "declined",
  "delivered",
  "measured",
] as const;
const OPPORTUNITY_SORT_VALUES = ["score", "updated", "evidence"] as const;
const OPPORTUNITY_PERIOD_VALUES = ["30d", "90d", "365d", "all"] as const;
const OPPORTUNITY_CONFIDENCE_VALUES = ["all", "low", "medium", "high"] as const;
const OPPORTUNITY_EVIDENCE_AGE_VALUES = ["all", "7", "30", "90"] as const;
const OPPORTUNITY_SCORE_MIN_VALUES = ["all", "10", "25", "50", "100"] as const;
const OPPORTUNITY_SCORE_MAX_VALUES = ["all", "25", "50", "100", "250"] as const;

function isThemePeriod(v: string): v is "30d" | "90d" | "365d" {
  return v === "30d" || v === "90d" || v === "365d";
}

const OPPORTUNITY_FILTER_DEFS = [
  { param: "oppState", options: OPPORTUNITY_STATE_VALUES },
  { param: "oppSort", options: OPPORTUNITY_SORT_VALUES },
  { param: "oppThemePeriod", options: OPPORTUNITY_PERIOD_VALUES },
  { param: "oppSegment" },
  { param: "oppOwner" },
  { param: "oppTheme" },
  { param: "oppConfidence", options: OPPORTUNITY_CONFIDENCE_VALUES },
  { param: "oppEvidenceAge", options: OPPORTUNITY_EVIDENCE_AGE_VALUES },
  { param: "oppScoreMin", options: OPPORTUNITY_SCORE_MIN_VALUES },
  { param: "oppScoreMax", options: OPPORTUNITY_SCORE_MAX_VALUES },
] as const;

export function useOpportunityDiscoveryFilters(managedProductId: number) {
  const filters = useBuildListFilters({
    filters: OPPORTUNITY_FILTER_DEFS,
    withSearch: false,
  });

  const pager = useCursorPageStack();

  const stateFilter = filters.value("oppState");
  const sortFilter = filters.value("oppSort");
  const themePeriod = filters.value("oppThemePeriod");
  const segmentFilter = filters.value("oppSegment");
  const ownerFilter = filters.value("oppOwner");
  const themeFilter = filters.value("oppTheme");
  const confidenceFilter = filters.value("oppConfidence");
  const evidenceAgeFilter = filters.value("oppEvidenceAge");
  const scoreMinFilter = filters.value("oppScoreMin");
  const scoreMaxFilter = filters.value("oppScoreMax");

  const facetsQuery = useFeedbucketSubmissionFacets({ managedProductId });
  const membersQuery = useOrgMembers(1, 100, undefined, INLINE_READ_ERROR);
  const themesQuery = useEvidenceThemes(managedProductId);

  const segmentOptions = useMemo(
    () => [
      { value: "all", label: "All segments" },
      ...(facetsQuery.data?.segments ?? [])
        .filter((s): s is { value: string; count: number } => s.value !== null)
        .map((s) => ({ value: s.value, label: s.value })),
    ],
    [facetsQuery.data?.segments],
  );

  const ownerOptions = useMemo(
    () => [
      { value: "all", label: "All owners" },
      ...(membersQuery.data?.data ?? []).map((m) => ({
        value: String(m.membershipId),
        label: m.name ?? m.email,
      })),
    ],
    [membersQuery.data?.data],
  );

  const themeOptions = useMemo(
    () => [
      { value: "all", label: "All themes" },
      ...(themesQuery.data?.themes ?? [])
        .filter((t): t is typeof t & { theme: string } => t.theme !== null)
        .map((t) => ({ value: t.theme, label: t.theme })),
    ],
    [themesQuery.data?.themes],
  );

  const typedSegment = segmentFilter.trim();
  const typedOwner =
    /^\d+$/.test(ownerFilter) && Number(ownerFilter) > 0 ? ownerFilter : "";
  const typedTheme = themeFilter.trim();

  const oppQueryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (pager.cursor) p.cursor = pager.cursor;
    if (stateFilter && stateFilter !== "all") p.state = stateFilter;
    if (sortFilter && sortFilter !== "all") p.sort = sortFilter;
    if (typedTheme && typedTheme !== BUILD_FILTER_ALL) p.theme = typedTheme;
    if (typedSegment && typedSegment !== BUILD_FILTER_ALL)
      p.segment = typedSegment;
    if (typedOwner) p.ownerMembershipId = typedOwner;
    if (confidenceFilter && confidenceFilter !== "all")
      p.confidence = confidenceFilter;
    if (evidenceAgeFilter && evidenceAgeFilter !== "all")
      p.evidenceAgeDays = evidenceAgeFilter;
    if (scoreMinFilter && scoreMinFilter !== "all") p.scoreMin = scoreMinFilter;
    if (scoreMaxFilter && scoreMaxFilter !== "all") p.scoreMax = scoreMaxFilter;
    return p;
  }, [
    pager.cursor,
    stateFilter,
    sortFilter,
    typedTheme,
    typedSegment,
    typedOwner,
    confidenceFilter,
    evidenceAgeFilter,
    scoreMinFilter,
    scoreMaxFilter,
  ]);

  const themeParams = useMemo(
    () =>
      themePeriod && isThemePeriod(themePeriod)
        ? { period: themePeriod }
        : themePeriod === "all"
          ? { period: "all" as const }
          : undefined,
    [themePeriod],
  );

  const isFiltered = !!(
    (stateFilter && stateFilter !== "all") ||
    (typedTheme && typedTheme !== BUILD_FILTER_ALL) ||
    (typedSegment && typedSegment !== BUILD_FILTER_ALL) ||
    typedOwner ||
    (confidenceFilter && confidenceFilter !== "all") ||
    (evidenceAgeFilter && evidenceAgeFilter !== "all") ||
    (scoreMinFilter && scoreMinFilter !== "all") ||
    (scoreMaxFilter && scoreMaxFilter !== "all")
  );

  const handleStateChange = useCallback(
    (v: string) => {
      filters.setValue("oppState", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleSortChange = useCallback(
    (v: string) => {
      filters.setValue("oppSort", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleThemePeriodChange = useCallback(
    (v: string) => filters.setValue("oppThemePeriod", v),
    [filters],
  );
  const handleSegmentChange = useCallback(
    (v: string) => {
      filters.setValue("oppSegment", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleOwnerChange = useCallback(
    (v: string) => {
      filters.setValue("oppOwner", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleThemeChange = useCallback(
    (v: string) => {
      filters.setValue("oppTheme", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleConfidenceChange = useCallback(
    (v: string) => {
      filters.setValue("oppConfidence", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleEvidenceAgeChange = useCallback(
    (v: string) => {
      filters.setValue("oppEvidenceAge", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleScoreMinChange = useCallback(
    (v: string) => {
      filters.setValue("oppScoreMin", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );
  const handleScoreMaxChange = useCallback(
    (v: string) => {
      filters.setValue("oppScoreMax", v);
      pager.resetToFirstPage();
    },
    [filters, pager],
  );

  const clearAll = useCallback(() => {
    filters.clearAll();
    pager.resetToFirstPage();
  }, [filters, pager]);

  return {
    pageNumber: pager.page,
    hasPreviousPage: pager.hasPrevious,
    goToNextPage: pager.goToNextPage,
    goToPreviousPage: pager.goToPreviousPage,
    stateFilter,
    sortFilter,
    themePeriod,
    segmentFilter,
    ownerFilter,
    themeFilter,
    confidenceFilter,
    evidenceAgeFilter,
    scoreMinFilter,
    scoreMaxFilter,
    segmentOptions,
    ownerOptions,
    themeOptions,
    oppQueryParams,
    themeParams,
    isFiltered,
    handleStateChange,
    handleSortChange,
    handleThemePeriodChange,
    handleSegmentChange,
    handleOwnerChange,
    handleThemeChange,
    handleConfidenceChange,
    handleEvidenceAgeChange,
    handleScoreMinChange,
    handleScoreMaxChange,
    clearAll,
  };
}
