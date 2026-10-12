"use client";

import { useMemo, type RefObject } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMultiFilterSelect } from "@/features/build/shared/build-multi-filter-select";
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
import { useRoadmapFilterHandlers } from "./roadmap-filter-handlers";

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

  const teamOpts = useMemo(
    () => (teamsPage?.data ?? []).map((t) => ({ value: String(t.id), label: t.name })),
    [teamsPage],
  );

  const goalOpts = useMemo(
    () => (goals ?? []).map((g) => ({ value: String(g.id), label: g.title })),
    [goals],
  );

  const segmentOpts = useMemo(
    () => (product?.segments ?? []).map((s) => ({ value: s, label: s })),
    [product],
  );

  const statusMultiOpts = useMemo(
    () => ROADMAP_STATUS_OPTS.filter((o) => o.value !== BUILD_FILTER_ALL),
    [],
  );

  const horizonMultiOpts = useMemo(
    () => ROADMAP_HORIZON_OPTS.filter((o) => o.value !== BUILD_FILTER_ALL),
    [],
  );

  const {
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
  } = useRoadmapFilterHandlers(listFilters);

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
            <BuildMultiFilterSelect
              label="Horizon"
              values={horizonValues}
              onValuesChange={handleHorizonValuesChange}
              options={horizonMultiOpts}
            />
          ),
        },
        {
          id: "status",
          label: "Status",
          active: listFilters.isActive("status"),
          control: (
            <BuildMultiFilterSelect
              label="Status"
              values={statusValues}
              onValuesChange={handleStatusValuesChange}
              options={statusMultiOpts}
            />
          ),
        },
        ...(teamOpts.length > 0
          ? [
              {
                id: "teamId",
                label: "Team",
                active: listFilters.isActive("teamId"),
                control: (
                  <BuildMultiFilterSelect
                    label="Team"
                    values={teamIdValues}
                    onValuesChange={handleTeamValuesChange}
                    options={teamOpts}
                  />
                ),
              },
            ]
          : []),
        ...(goalOpts.length > 0
          ? [
              {
                id: "goalId",
                label: "Goal",
                active: listFilters.isActive("goalId"),
                control: (
                  <BuildMultiFilterSelect
                    label="Goal"
                    values={goalIdValues}
                    onValuesChange={handleGoalValuesChange}
                    options={goalOpts}
                  />
                ),
              },
            ]
          : []),
        ...(segmentOpts.length > 0
          ? [
              {
                id: "segment",
                label: "Segment",
                active: listFilters.isActive("segment"),
                control: (
                  <BuildMultiFilterSelect
                    label="Segment"
                    values={segmentValues}
                    onValuesChange={handleSegmentValuesChange}
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
