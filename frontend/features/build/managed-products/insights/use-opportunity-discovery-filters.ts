"use client";

import { useCallback, useMemo, useState } from "react";
import { useBuildListFilters, BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import { useFeedbucketSubmissionFacets } from "@/hooks/api/feedbucket";
import { useOrgMembers } from "@/hooks/api/organization";

const OPPORTUNITY_FILTER_DEFS = [
  { param: "oppState" },
  { param: "oppSort" },
  { param: "oppThemePeriod" },
  { param: "oppSegment" },
  { param: "oppOwner" },
  { param: "oppConfidence" },
  { param: "oppEvidenceAge" },
  { param: "oppScoreMin" },
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
  const membersQuery = useOrgMembers(1, 100);

  const segmentOptions = useMemo(() => [
    { value: "all", label: "All segments" },
    ...(facetsQuery.data?.segments ?? [])
      .filter((s): s is { value: string; count: number } => s.value !== null)
      .map((s) => ({ value: s.value, label: s.value })),
  ], [facetsQuery.data?.segments]);

  const ownerOptions = useMemo(() => [
    { value: "all", label: "All owners" },
    ...(membersQuery.data?.data ?? []).map((m) => ({
      value: String(m.membershipId),
      label: m.name ?? m.email,
    })),
  ], [membersQuery.data?.data]);

  const oppQueryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (stateFilter && stateFilter !== "all") p.state = stateFilter;
    if (sortFilter && sortFilter !== "all") p.sort = sortFilter;
    if (filters.cursor) p.cursor = filters.cursor;
    if (segmentFilter && segmentFilter !== BUILD_FILTER_ALL) p.segment = segmentFilter;
    if (ownerFilter && ownerFilter !== BUILD_FILTER_ALL) p.ownerMembershipId = ownerFilter;
    if (confidenceFilter && confidenceFilter !== "all") p.confidence = confidenceFilter;
    if (evidenceAgeFilter && evidenceAgeFilter !== "all") p.evidenceAgeDays = evidenceAgeFilter;
    if (scoreMinFilter && scoreMinFilter !== "all") p.scoreMin = scoreMinFilter;
    return p;
  }, [stateFilter, sortFilter, filters.cursor, segmentFilter, ownerFilter, confidenceFilter, evidenceAgeFilter, scoreMinFilter]);

  const themeParams = useMemo(
    () =>
      themePeriod === "30d" || themePeriod === "90d" || themePeriod === "365d"
        ? { period: themePeriod as "30d" | "90d" | "365d" }
        : themePeriod === "all"
          ? { period: "all" as const }
          : undefined,
    [themePeriod],
  );

  const isFiltered = !!(
    (stateFilter && stateFilter !== "all") ||
    (segmentFilter && segmentFilter !== BUILD_FILTER_ALL) ||
    (ownerFilter && ownerFilter !== BUILD_FILTER_ALL) ||
    (confidenceFilter && confidenceFilter !== "all") ||
    (evidenceAgeFilter && evidenceAgeFilter !== "all") ||
    (scoreMinFilter && scoreMinFilter !== "all")
  );

  const handleStateChange = useCallback(
    (v: string) => { filters.setValue("oppState", v); setPageNumber(1); },
    [filters],
  );
  const handleSortChange = useCallback(
    (v: string) => { filters.setValue("oppSort", v); setPageNumber(1); },
    [filters],
  );
  const handleThemePeriodChange = useCallback(
    (v: string) => filters.setValue("oppThemePeriod", v),
    [filters],
  );
  const handleSegmentChange = useCallback(
    (v: string) => { filters.setValue("oppSegment", v); setPageNumber(1); },
    [filters],
  );
  const handleOwnerChange = useCallback(
    (v: string) => { filters.setValue("oppOwner", v); setPageNumber(1); },
    [filters],
  );
  const handleConfidenceChange = useCallback(
    (v: string) => { filters.setValue("oppConfidence", v); setPageNumber(1); },
    [filters],
  );
  const handleEvidenceAgeChange = useCallback(
    (v: string) => { filters.setValue("oppEvidenceAge", v); setPageNumber(1); },
    [filters],
  );
  const handleScoreMinChange = useCallback(
    (v: string) => { filters.setValue("oppScoreMin", v); setPageNumber(1); },
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
  };
}
