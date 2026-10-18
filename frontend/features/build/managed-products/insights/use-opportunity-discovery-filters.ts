"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { useFeedbucketSubmissionFacets } from "@/hooks/api/feedbucket";
import { useOrgMembers } from "@/hooks/api/organization";
import { useEvidenceThemes } from "@/hooks/api/build/product-discovery";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

export const OPP_CURSOR_PARAM = "opp_cursor";
export const OPP_PREV_PARAM = "opp_prev";

const OPPORTUNITY_SORT_VALUES = ["score", "updated", "evidence"] as const;
const OPPORTUNITY_PERIOD_VALUES = ["30d", "90d", "365d", "all"] as const;
const OPPORTUNITY_EVIDENCE_AGE_VALUES = ["all", "7", "30", "90"] as const;
const OPPORTUNITY_SCORE_MIN_VALUES = ["all", "10", "25", "50", "100"] as const;
const OPPORTUNITY_SCORE_MAX_VALUES = ["all", "25", "50", "100", "250"] as const;

function isThemePeriod(v: string): v is "30d" | "90d" | "365d" {
  return v === "30d" || v === "90d" || v === "365d";
}

function splitMulti(raw: string): string[] {
  if (!raw || raw === BUILD_FILTER_ALL) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const OPPORTUNITY_FILTER_DEFS = [
  { param: "oppSort", options: OPPORTUNITY_SORT_VALUES },
  { param: "oppThemePeriod", options: OPPORTUNITY_PERIOD_VALUES },
  { param: "oppState" },
  { param: "oppSegment" },
  { param: "oppOwner" },
  { param: "oppTheme" },
  { param: "oppConfidence" },
  { param: "oppEvidenceAge", options: OPPORTUNITY_EVIDENCE_AGE_VALUES },
  { param: "oppScoreMin", options: OPPORTUNITY_SCORE_MIN_VALUES },
  { param: "oppScoreMax", options: OPPORTUNITY_SCORE_MAX_VALUES },
  { param: OPP_CURSOR_PARAM },
  { param: OPP_PREV_PARAM },
] as const;

export function useOpportunityDiscoveryFilters(managedProductId: number) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filters = useBuildListFilters({
    filters: OPPORTUNITY_FILTER_DEFS,
    withSearch: true as const,
  });

  const filtersValue = filters.value;
  const sortFilter = filtersValue("oppSort");
  const themePeriod = filtersValue("oppThemePeriod");
  const evidenceAgeFilter = filtersValue("oppEvidenceAge");
  const scoreMinFilter = filtersValue("oppScoreMin");
  const scoreMaxFilter = filtersValue("oppScoreMax");
  const stateValues = useMemo(() => splitMulti(filtersValue("oppState")), [filtersValue]);
  const segmentValues = useMemo(() => splitMulti(filtersValue("oppSegment")), [filtersValue]);
  const ownerValues = useMemo(() => splitMulti(filtersValue("oppOwner")), [filtersValue]);
  const themeValues = useMemo(() => splitMulti(filtersValue("oppTheme")), [filtersValue]);
  const confidenceValues = useMemo(() => splitMulti(filtersValue("oppConfidence")), [filtersValue]);

  const cursorValue = searchParams.get(OPP_CURSOR_PARAM);
  const prevParamValue = searchParams.get(OPP_PREV_PARAM);
  const prevStack = useMemo(
    () => (prevParamValue ? prevParamValue.split("|").filter(Boolean) : []),
    [prevParamValue],
  );
  const pageNumber = prevStack.length + 1;
  const hasPreviousPage = prevStack.length > 0;

  const writeCursorParams = useCallback(
    (updates: Record<string, string | null>, usePush: boolean) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        if (usePush) router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  const filtersSetValues = filters.setValues;
  const setFilterFromFirstPage = useCallback(
    (param: string, value: string) => {
      filtersSetValues({ [param]: value, [OPP_CURSOR_PARAM]: "", [OPP_PREV_PARAM]: "" });
    },
    [filtersSetValues],
  );

  const facetsQuery = useFeedbucketSubmissionFacets({ managedProductId });
  const membersQuery = useOrgMembers(1, 100, undefined, INLINE_READ_ERROR);
  const themesQuery = useEvidenceThemes(managedProductId);

  const segmentOptions = useMemo(
    () =>
      (facetsQuery.data?.segments ?? [])
        .filter((s): s is { value: string; count: number } => s.value !== null)
        .map((s) => ({ value: s.value, label: s.value })),
    [facetsQuery.data?.segments],
  );

  const ownerOptions = useMemo(
    () =>
      (membersQuery.data?.data ?? []).map((m) => ({
        value: String(m.membershipId),
        label: m.name ?? m.email,
      })),
    [membersQuery.data?.data],
  );

  const themeOptions = useMemo(
    () =>
      (themesQuery.data?.themes ?? [])
        .filter((t): t is typeof t & { theme: string } => t.theme !== null)
        .map((t) => ({ value: t.theme, label: t.theme })),
    [themesQuery.data?.themes],
  );

  const filtersSearch = filters as typeof filters & {
    debouncedSearch: string;
    setSearch: (v: string) => void;
    search: string;
  };

  const oppQueryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (cursorValue) p.cursor = cursorValue;
    if (stateValues.length > 0) p.state = stateValues.join(",");
    if (sortFilter && sortFilter !== BUILD_FILTER_ALL) p.sort = sortFilter;
    if (themeValues.length > 0) p.theme = themeValues.join(",");
    if (segmentValues.length > 0) p.segment = segmentValues.join(",");
    if (ownerValues.length > 0) p.ownerMembershipId = ownerValues.join(",");
    if (confidenceValues.length > 0) p.confidence = confidenceValues.join(",");
    if (evidenceAgeFilter && evidenceAgeFilter !== BUILD_FILTER_ALL)
      p.evidenceAgeDays = evidenceAgeFilter;
    if (scoreMinFilter && scoreMinFilter !== BUILD_FILTER_ALL) p.scoreMin = scoreMinFilter;
    if (scoreMaxFilter && scoreMaxFilter !== BUILD_FILTER_ALL) p.scoreMax = scoreMaxFilter;
    if (filtersSearch.debouncedSearch) p.search = filtersSearch.debouncedSearch;
    return p;
  }, [
    cursorValue,
    stateValues,
    sortFilter,
    themeValues,
    segmentValues,
    ownerValues,
    confidenceValues,
    evidenceAgeFilter,
    scoreMinFilter,
    scoreMaxFilter,
    filtersSearch.debouncedSearch,
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
    stateValues.length > 0 ||
    themeValues.length > 0 ||
    segmentValues.length > 0 ||
    ownerValues.length > 0 ||
    confidenceValues.length > 0 ||
    (evidenceAgeFilter && evidenceAgeFilter !== BUILD_FILTER_ALL) ||
    (scoreMinFilter && scoreMinFilter !== BUILD_FILTER_ALL) ||
    (scoreMaxFilter && scoreMaxFilter !== BUILD_FILTER_ALL) ||
    filtersSearch.debouncedSearch.length > 0
  );

  const goToNextPage = useCallback(
    (nextCursor: string | null) => {
      if (!nextCursor) return;
      const stack = prevParamValue ? prevParamValue.split("|") : [];
      stack.push(cursorValue ?? "0");
      writeCursorParams(
        { [OPP_CURSOR_PARAM]: nextCursor, [OPP_PREV_PARAM]: stack.join("|") },
        true,
      );
    },
    [cursorValue, prevParamValue, writeCursorParams],
  );

  const goToPreviousPage = useCallback(() => {
    if (!hasPreviousPage) return;
    const stack = prevParamValue ? prevParamValue.split("|") : [];
    const goToRaw = stack.pop() ?? "0";
    writeCursorParams(
      {
        [OPP_CURSOR_PARAM]: goToRaw === "0" ? null : goToRaw,
        [OPP_PREV_PARAM]: stack.length > 0 ? stack.join("|") : null,
      },
      true,
    );
  }, [hasPreviousPage, prevParamValue, writeCursorParams]);

  const handleStateValuesChange = useCallback(
    (values: string[]) => {
      setFilterFromFirstPage("oppState", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL);
    },
    [setFilterFromFirstPage],
  );
  const handleSortChange = useCallback(
    (v: string) => {
      setFilterFromFirstPage("oppSort", v);
    },
    [setFilterFromFirstPage],
  );
  const filtersSetValue = filters.setValue;
  const handleThemePeriodChange = useCallback(
    (v: string) => filtersSetValue("oppThemePeriod", v),
    [filtersSetValue],
  );
  const handleSegmentValuesChange = useCallback(
    (values: string[]) => {
      setFilterFromFirstPage("oppSegment", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL);
    },
    [setFilterFromFirstPage],
  );
  const handleOwnerValuesChange = useCallback(
    (values: string[]) => {
      setFilterFromFirstPage("oppOwner", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL);
    },
    [setFilterFromFirstPage],
  );
  const handleThemeValuesChange = useCallback(
    (values: string[]) => {
      setFilterFromFirstPage("oppTheme", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL);
    },
    [setFilterFromFirstPage],
  );
  const handleConfidenceValuesChange = useCallback(
    (values: string[]) => {
      setFilterFromFirstPage("oppConfidence", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL);
    },
    [setFilterFromFirstPage],
  );
  const handleEvidenceAgeChange = useCallback(
    (v: string) => {
      setFilterFromFirstPage("oppEvidenceAge", v);
    },
    [setFilterFromFirstPage],
  );
  const handleScoreMinChange = useCallback(
    (v: string) => {
      setFilterFromFirstPage("oppScoreMin", v);
    },
    [setFilterFromFirstPage],
  );
  const handleScoreMaxChange = useCallback(
    (v: string) => {
      setFilterFromFirstPage("oppScoreMax", v);
    },
    [setFilterFromFirstPage],
  );

  const filtersClearAll = filters.clearAll;
  const clearAll = useCallback(() => filtersClearAll(), [filtersClearAll]);

  return {
    pageNumber,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    sortFilter,
    themePeriod,
    evidenceAgeFilter,
    scoreMinFilter,
    scoreMaxFilter,
    stateValues,
    segmentValues,
    ownerValues,
    themeValues,
    confidenceValues,
    segmentOptions,
    ownerOptions,
    themeOptions,
    oppQueryParams,
    themeParams,
    isFiltered,
    search: filtersSearch.search,
    handleSearchChange: filtersSearch.setSearch,
    handleStateValuesChange,
    handleSortChange,
    handleThemePeriodChange,
    handleSegmentValuesChange,
    handleOwnerValuesChange,
    handleThemeValuesChange,
    handleConfidenceValuesChange,
    handleEvidenceAgeChange,
    handleScoreMinChange,
    handleScoreMaxChange,
    clearAll,
  };
}
