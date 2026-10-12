"use client";

import { useCallback, useMemo } from "react";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";

function splitMulti(raw: string): string[] {
  if (!raw || raw === BUILD_FILTER_ALL) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function useRoadmapFilterHandlers(listFilters: BuildListFiltersState) {
  const sortValue = listFilters.value("sort");
  const confidenceMinValue = listFilters.value("confidenceMin");
  const targetFromValue = listFilters.value("targetFrom");
  const targetToValue = listFilters.value("targetTo");
  const customerVisibleValue = listFilters.value("customerVisible");
  const evidenceStateValue = listFilters.value("evidenceState");

  const horizonValues = useMemo(
    () => splitMulti(listFilters.value("horizon")),
    [listFilters],
  );
  const statusValues = useMemo(
    () => splitMulti(listFilters.value("status")),
    [listFilters],
  );
  const teamIdValues = useMemo(
    () => splitMulti(listFilters.value("teamId")),
    [listFilters],
  );
  const goalIdValues = useMemo(
    () => splitMulti(listFilters.value("goalId")),
    [listFilters],
  );
  const segmentValues = useMemo(
    () => splitMulti(listFilters.value("segment")),
    [listFilters],
  );

  const handleHorizonValuesChange = useCallback(
    (values: string[]) =>
      listFilters.setValue(
        "horizon",
        values.length > 0 ? values.join(",") : BUILD_FILTER_ALL,
      ),
    [listFilters],
  );
  const handleStatusValuesChange = useCallback(
    (values: string[]) =>
      listFilters.setValue(
        "status",
        values.length > 0 ? values.join(",") : BUILD_FILTER_ALL,
      ),
    [listFilters],
  );
  const handleSortChange = useCallback(
    (v: string) => listFilters.setValue("sort", v),
    [listFilters],
  );
  const handleConfidenceChange = useCallback(
    (v: string) => listFilters.setValue("confidenceMin", v),
    [listFilters],
  );
  const handleTeamValuesChange = useCallback(
    (values: string[]) =>
      listFilters.setValue(
        "teamId",
        values.length > 0 ? values.join(",") : BUILD_FILTER_ALL,
      ),
    [listFilters],
  );
  const handleGoalValuesChange = useCallback(
    (values: string[]) =>
      listFilters.setValue(
        "goalId",
        values.length > 0 ? values.join(",") : BUILD_FILTER_ALL,
      ),
    [listFilters],
  );
  const handleSegmentValuesChange = useCallback(
    (values: string[]) =>
      listFilters.setValue(
        "segment",
        values.length > 0 ? values.join(",") : BUILD_FILTER_ALL,
      ),
    [listFilters],
  );
  const handleTargetFromChange = useCallback(
    (value: string) =>
      listFilters.setValue("targetFrom", value || BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleTargetToChange = useCallback(
    (value: string) =>
      listFilters.setValue("targetTo", value || BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleCustomerVisibleChange = useCallback(
    (v: string) => listFilters.setValue("customerVisible", v),
    [listFilters],
  );
  const handleEvidenceStateChange = useCallback(
    (v: string) => listFilters.setValue("evidenceState", v),
    [listFilters],
  );

  const targetFromDate =
    targetFromValue === BUILD_FILTER_ALL ? "" : targetFromValue;
  const targetToDate = targetToValue === BUILD_FILTER_ALL ? "" : targetToValue;

  return {
    horizonValues,
    statusValues,
    teamIdValues,
    goalIdValues,
    segmentValues,
    sortValue,
    confidenceMinValue,
    targetFromDate,
    targetToDate,
    customerVisibleValue,
    evidenceStateValue,
    handleHorizonValuesChange,
    handleStatusValuesChange,
    handleSortChange,
    handleConfidenceChange,
    handleTeamValuesChange,
    handleGoalValuesChange,
    handleSegmentValuesChange,
    handleTargetFromChange,
    handleTargetToChange,
    handleCustomerVisibleChange,
    handleEvidenceStateChange,
  };
}
