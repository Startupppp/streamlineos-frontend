"use client";

import { useCallback } from "react";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";

export function useRoadmapFilterHandlers(listFilters: BuildListFiltersState) {
  const horizonValue = listFilters.value("horizon");
  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");
  const confidenceMinValue = listFilters.value("confidenceMin");
  const teamIdValue = listFilters.value("teamId");
  const goalIdValue = listFilters.value("goalId");
  const segmentValue = listFilters.value("segment");
  const targetFromValue = listFilters.value("targetFrom");
  const targetToValue = listFilters.value("targetTo");
  const customerVisibleValue = listFilters.value("customerVisible");
  const evidenceStateValue = listFilters.value("evidenceState");

  const handleHorizonChange = useCallback(
    (v: string) => listFilters.setValue("horizon", v),
    [listFilters],
  );
  const handleStatusChange = useCallback(
    (v: string) => listFilters.setValue("status", v),
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
  const handleTeamChange = useCallback(
    (v: string) => listFilters.setValue("teamId", v),
    [listFilters],
  );
  const handleGoalChange = useCallback(
    (v: string) => listFilters.setValue("goalId", v),
    [listFilters],
  );
  const handleSegmentChange = useCallback(
    (v: string) => listFilters.setValue("segment", v),
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
    horizonValue,
    statusValue,
    sortValue,
    confidenceMinValue,
    teamIdValue,
    goalIdValue,
    segmentValue,
    targetFromDate,
    targetToDate,
    customerVisibleValue,
    evidenceStateValue,
    handleHorizonChange,
    handleStatusChange,
    handleSortChange,
    handleConfidenceChange,
    handleTeamChange,
    handleGoalChange,
    handleSegmentChange,
    handleTargetFromChange,
    handleTargetToChange,
    handleCustomerVisibleChange,
    handleEvidenceStateChange,
  };
}
