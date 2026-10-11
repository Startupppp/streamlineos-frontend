"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { useFeedbucketSubmissionFacets } from "@/hooks/api/feedbucket";
import { useOrgMembers } from "@/hooks/api/organization";
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

function isThemePeriod(v: string): v is "30d" | "90d" | "365d" {
  return v === "30d" || v === "90d" || v === "365d";
}

const OPPORTUNITY_FILTER_DEFS = [
  { param: "oppState", options: OPPORTUNITY_STATE_VALUES },
  { param: "oppSort", options: OPPORTUNITY_SORT_VALUES },
  { param: "oppThemePeriod", options: OPPORTUNITY_PERIOD_VALUES },
  { param: "oppSegment" },
  { param: "oppOwner" },
  { param: "oppConfidence", options: OPPORTUNITY_CONFIDENCE_VALUES },
  { param: "oppEvidenceAge", options: OPPORTUNITY_EVIDENCE_AGE_VALUES },
  { param: "oppScoreMin", options: OPPORTUNITY_SCORE_MIN_VALUES },
] as const;

export function useOpportunityDiscoveryFilters(managedProductId: number) {
  const filters = useBuildListFilters({
    filters: OPPORTUNITY_FILTER_DEFS,
    withSearch: false,
  });

  const [pageNumber, setPageNumber] = useState(1);

  const stateFilter = filters.value("oppState");
  const sortFilter = filters.value("oppSort");
  const themePeriod = filters.value("oppThemePeriod");
  const segmentFilter = filters.value("oppSegment");
  const ownerFilter = filters.value("oppOwner");
  const confidenceFilter = filters.value("oppConfidence");
  const evidenceAgeFilter = filters.value("oppEvidenceAge");
  const scoreMinFilter = filters.value("oppScoreMin");

  const facetsQuery = useFeedbucketSubmissionFacets({ managedProductId });
  const membersQuery = useOrgMembers(1, 100, undefined, INLINE_READ_ERROR);

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

  const typedSegment = segmentFilter.trim();
  const typedOwner =
    /^\d+$/.test(ownerFilter) && Number(ownerFilter) > 0 ? ownerFilter : "";

  const oppQueryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (stateFilter && stateFilter !== "all") p.state = stateFilter;
    if (sortFilter && sortFilter !== "all") p.sort = sortFilter;
    if (filters.cursor) p.cursor = filters.cursor;
    if (typedSegment && typedSegment !== BUILD_FILTER_ALL)
      p.segment = typedSegment;
    if (typedOwner) p.ownerMembershipId = typedOwner;
    if (confidenceFilter && confidenceFilter !== "all")
      p.confidence = confidenceFilter;
    if (evidenceAgeFilter && evidenceAgeFilter !== "all")
      p.evidenceAgeDays = evidenceAgeFilter;
    if (scoreMinFilter && scoreMinFilter !== "all") p.scoreMin = scoreMinFilter;
    return p;
  }, [
    stateFilter,
    sortFilter,
    filters.cursor,
    typedSegment,
    typedOwner,
    confidenceFilter,
    evidenceAgeFilter,
    scoreMinFilter,
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
    (typedSegment && typedSegment !== BUILD_FILTER_ALL) ||
    typedOwner ||
    (confidenceFilter && confidenceFilter !== "all") ||
    (evidenceAgeFilter && evidenceAgeFilter !== "all") ||
    (scoreMinFilter && scoreMinFilter !== "all")
  );

  const handleStateChange = useCallback(
    (v: string) => {
      filters.setValue("oppState", v);
      setPageNumber(1);
    },
    [filters],
  );
  const handleSortChange = useCallback(
    (v: string) => {
      filters.setValue("oppSort", v);
      setPageNumber(1);
    },
    [filters],
  );
  const handleThemePeriodChange = useCallback(
    (v: string) => filters.setValue("oppThemePeriod", v),
    [filters],
  );
  const handleSegmentChange = useCallback(
    (v: string) => {
      filters.setValue("oppSegment", v);
      setPageNumber(1);
    },
    [filters],
  );
  const handleOwnerChange = useCallback(
    (v: string) => {
      filters.setValue("oppOwner", v);
      setPageNumber(1);
    },
    [filters],
  );
  const handleConfidenceChange = useCallback(
    (v: string) => {
      filters.setValue("oppConfidence", v);
      setPageNumber(1);
    },
    [filters],
  );
  const handleEvidenceAgeChange = useCallback(
    (v: string) => {
      filters.setValue("oppEvidenceAge", v);
      setPageNumber(1);
    },
    [filters],
  );
  const handleScoreMinChange = useCallback(
    (v: string) => {
      filters.setValue("oppScoreMin", v);
      setPageNumber(1);
    },
    [filters],
  );

  return {
    pageNumber,
    setPageNumber,
    setCursor: filters.setCursor,
    stateFilter,
    sortFilter,
    themePeriod,
    segmentFilter,
    ownerFilter,
    confidenceFilter,
    evidenceAgeFilter,
    scoreMinFilter,
    segmentOptions,
    ownerOptions,
    oppQueryParams,
    themeParams,
    isFiltered,
    handleStateChange,
    handleSortChange,
    handleThemePeriodChange,
    handleSegmentChange,
    handleOwnerChange,
    handleConfidenceChange,
    handleEvidenceAgeChange,
    handleScoreMinChange,
    clearAll: filters.clearAll,
  };
}
