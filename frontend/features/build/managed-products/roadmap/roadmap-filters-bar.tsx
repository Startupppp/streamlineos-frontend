"use client";

import { useCallback, useMemo, type RefObject } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { useGoals } from "@/hooks/api/goals";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import {
  ROADMAP_STATUS_OPTS,
  ROADMAP_HORIZON_OPTS,
  ROADMAP_SORT_OPTS,
  ROADMAP_CONFIDENCE_OPTS,
  ROADMAP_CUSTOMER_VISIBILITY_OPTS,
  ROADMAP_EVIDENCE_STATE_OPTS,
} from "../product-roadmap-model";

interface RoadmapFiltersBarProps {
  managedProductId: number;
  listFilters: BuildListFiltersState;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function RoadmapFiltersBar({
  managedProductId,
  listFilters,
  searchInputRef,
}: RoadmapFiltersBarProps) {
  const { data: teamsPage } = useProjectTeams();
  const { data: goals } = useGoals({ managedProductId });
  const { data: product } = useManagedProduct(managedProductId);

  const teamOpts = useMemo(() => {
    const teams = teamsPage?.data ?? [];
    return [
      { value: BUILD_FILTER_ALL, label: "All teams" },
      ...teams.map((t) => ({ value: String(t.id), label: t.name })),
    ];
  }, [teamsPage]);

  const goalOpts = useMemo(() => {
    const items = goals ?? [];
    return [
      { value: BUILD_FILTER_ALL, label: "All goals" },
      ...items.map((g) => ({ value: String(g.id), label: g.title })),
    ];
  }, [goals]);

  const segmentOpts = useMemo(() => {
    const segs = product?.segments ?? [];
    return [
      { value: BUILD_FILTER_ALL, label: "All segments" },
      ...segs.map((s) => ({ value: s, label: s })),
    ];
  }, [product]);

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

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search roadmap…",
        label: "Search roadmap",
        inputRef: searchInputRef,
      }}
      filters={[
        {
          id: "horizon",
          label: "Horizon",
          active: listFilters.isActive("horizon"),
          control: (
            <BuildFilterSelect
              label="Horizon"
              value={horizonValue}
              onValueChange={handleHorizonChange}
              options={ROADMAP_HORIZON_OPTS}
            />
          ),
        },
        {
          id: "status",
          label: "Status",
          active: listFilters.isActive("status"),
          control: (
            <BuildFilterSelect
              label="Status"
              value={statusValue}
              onValueChange={handleStatusChange}
              options={ROADMAP_STATUS_OPTS}
            />
          ),
        },
        ...(teamOpts.length > 1
          ? [
              {
                id: "teamId",
                label: "Team",
                active: listFilters.isActive("teamId"),
                control: (
                  <BuildFilterSelect
                    label="Team"
                    value={teamIdValue}
                    onValueChange={handleTeamChange}
                    options={teamOpts}
                  />
                ),
              },
            ]
          : []),
        ...(goalOpts.length > 1
          ? [
              {
                id: "goalId",
                label: "Goal",
                active: listFilters.isActive("goalId"),
                control: (
                  <BuildFilterSelect
                    label="Goal"
                    value={goalIdValue}
                    onValueChange={handleGoalChange}
                    options={goalOpts}
                  />
                ),
              },
            ]
          : []),
        ...(segmentOpts.length > 1
          ? [
              {
                id: "segment",
                label: "Segment",
                active: listFilters.isActive("segment"),
                control: (
                  <BuildFilterSelect
                    label="Segment"
                    value={segmentValue}
                    onValueChange={handleSegmentChange}
                    options={segmentOpts}
                  />
                ),
              },
            ]
          : []),
        {
          id: "confidenceMin",
          label: "Confidence",
          active: listFilters.isActive("confidenceMin"),
          control: (
            <BuildFilterSelect
              label="Confidence"
              value={confidenceMinValue}
              onValueChange={handleConfidenceChange}
              options={ROADMAP_CONFIDENCE_OPTS}
            />
          ),
        },
        {
          id: "targetFrom",
          label: "From",
          active: listFilters.isActive("targetFrom"),
          control: (
            <DatePicker
              ariaLabel="Target from"
              clearable
              value={targetFromDate}
              onChange={handleTargetFromChange}
              placeholder="From"
              dateFormat="dd MMM yyyy"
              toDate={
                targetToDate ? new Date(`${targetToDate}T00:00:00`) : undefined
              }
              className="w-full min-w-0 max-w-none"
            />
          ),
        },
        {
          id: "targetTo",
          label: "To",
          active: listFilters.isActive("targetTo"),
          control: (
            <DatePicker
              ariaLabel="Target to"
              clearable
              value={targetToDate}
              onChange={handleTargetToChange}
              placeholder="To"
              dateFormat="dd MMM yyyy"
              fromDate={
                targetFromDate
                  ? new Date(`${targetFromDate}T00:00:00`)
                  : undefined
              }
              className="w-full min-w-0 max-w-none"
            />
          ),
        },
        {
          id: "customerVisible",
          label: "Visibility",
          active: listFilters.isActive("customerVisible"),
          control: (
            <BuildFilterSelect
              label="Customer visibility"
              value={customerVisibleValue}
              onValueChange={handleCustomerVisibleChange}
              options={ROADMAP_CUSTOMER_VISIBILITY_OPTS}
            />
          ),
        },
        {
          id: "evidenceState",
          label: "Evidence",
          active: listFilters.isActive("evidenceState"),
          control: (
            <BuildFilterSelect
              label="Evidence state"
              value={evidenceStateValue}
              onValueChange={handleEvidenceStateChange}
              options={ROADMAP_EVIDENCE_STATE_OPTS}
            />
          ),
        },
        {
          id: "sort",
          label: "Sort",
          active: listFilters.isActive("sort"),
          control: (
            <BuildFilterSelect
              label="Sort"
              value={sortValue}
              onValueChange={handleSortChange}
              options={ROADMAP_SORT_OPTS}
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );
}
