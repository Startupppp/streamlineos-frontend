"use client";

import { useCallback, useMemo, type ReactNode, type RefObject } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { BuildFilterOption } from "@/features/build/shared/build-filter-select";
import { BuildMultiFilterSelect } from "@/features/build/shared/build-multi-filter-select";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";
import { LEVEL_OPTIONS, METRIC_OPTIONS, STATUS_OPTIONS } from "./constants";

function splitMultiGoal(raw: string): string[] {
  if (!raw || raw === BUILD_FILTER_ALL) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const GOAL_LEVEL_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All levels" },
  ...LEVEL_OPTIONS,
];

export const GOAL_FILTER_DEFINITIONS = [
  { param: "level", options: LEVEL_OPTIONS.map((option) => option.value) },
  { param: "status", options: STATUS_OPTIONS.map((option) => option.value) },
  { param: "ownerId" },
  { param: "health" },
  { param: "due" },
  { param: "scope" },
  { param: "metricType" },
] as const;

const GOAL_HEALTH_VALUES = ["on_track", "at_risk", "off_track"] as const;
const GOAL_DUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isGoalHealth(v: string): v is (typeof GOAL_HEALTH_VALUES)[number] {
  return GOAL_HEALTH_VALUES.some((h) => h === v);
}
const GOAL_DUE_FILTER_LABEL = "Due on or before";

const GOAL_SCOPE_FILTER_OPTIONS: readonly BuildFilterOption[] = [
  { value: BUILD_FILTER_ALL, label: "All goals" },
  { value: "own", label: "My goals" },
];

const GOAL_HEALTH_FILTER_OPTIONS: readonly BuildFilterOption[] = [
  { value: BUILD_FILTER_ALL, label: "Any health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
];

const GOAL_METRIC_FILTER_OPTIONS: readonly BuildFilterOption[] = [
  { value: BUILD_FILTER_ALL, label: "All types" },
  ...METRIC_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

interface GoalOutcomeParams {
  health?: string[];
  scope?: "own" | "all";
  due?: string;
  metricType?: "number" | "percentage" | "currency" | "boolean";
}

export function resolveGoalOutcomeParams(
  read: (param: string) => string,
): GoalOutcomeParams {
  const params: GoalOutcomeParams = {};
  const healthRaw = read("health");
  const scope = read("scope");
  const due = read("due");
  const metricType = read("metricType");
  const healthVals = splitMultiGoal(healthRaw).filter(isGoalHealth);
  if (healthVals.length > 0) params.health = healthVals;
  if (scope === "own") params.scope = "own";
  if (GOAL_DUE_PATTERN.test(due)) params.due = due;
  if (METRIC_OPTIONS.some((option) => option.value === metricType)) {
    params.metricType = metricType as GoalOutcomeParams["metricType"];
  }
  return params;
}

interface GoalsListToolbarProps {
  listFilters: BuildListFiltersState;
  ownerOptions?: readonly BuildFilterOption[];
  searchInputRef?: RefObject<HTMLInputElement | null>;
  trailing?: ReactNode;
}

export function GoalsListToolbar({
  listFilters,
  ownerOptions,
  searchInputRef,
  trailing,
}: GoalsListToolbarProps) {
  const handleLevelChange = useCallback(
    (value: string) => listFilters.setValue("level", value),
    [listFilters],
  );
  const handleStatusValuesChange = useCallback(
    (values: string[]) => listFilters.setValue("status", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleOwnerValuesChange = useCallback(
    (values: string[]) => listFilters.setValue("ownerId", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleScopeChange = useCallback(
    (value: string) => listFilters.setValue("scope", value),
    [listFilters],
  );
  const handleHealthValuesChange = useCallback(
    (values: string[]) => listFilters.setValue("health", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleMetricTypeChange = useCallback(
    (value: string) => listFilters.setValue("metricType", value),
    [listFilters],
  );
  const handleDueChange = useCallback(
    (value: string) => listFilters.setValue("due", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const dueValue = listFilters.value("due");
  const statusValues = useMemo(() => splitMultiGoal(listFilters.value("status")), [listFilters]);
  const healthValues = useMemo(() => splitMultiGoal(listFilters.value("health")), [listFilters]);
  const ownerValues = useMemo(() => splitMultiGoal(listFilters.value("ownerId")), [listFilters]);

  const resolvedOwnerOptions = useMemo<readonly BuildFilterOption[]>(
    () => ownerOptions ?? [],
    [ownerOptions],
  );

  const filters = useMemo(
    () => [
      {
        id: "level",
        label: "Level",
        active: listFilters.isActive("level"),
        control: (
          <BuildFilterSelect
            label="Level"
            value={listFilters.value("level")}
            onValueChange={handleLevelChange}
            options={GOAL_LEVEL_FILTER_OPTIONS}
          />
        ),
      },
      {
        id: "status",
        label: "Status",
        active: statusValues.length > 0,
        control: (
          <BuildMultiFilterSelect
            label="Status"
            values={statusValues}
            onValuesChange={handleStatusValuesChange}
            options={STATUS_OPTIONS}
          />
        ),
      },
      {
        id: "owner",
        label: "Owner",
        active: ownerValues.length > 0,
        control: (
          <BuildMultiFilterSelect
            label="Owner"
            values={ownerValues}
            onValuesChange={handleOwnerValuesChange}
            options={resolvedOwnerOptions}
          />
        ),
      },
      {
        id: "scope",
        label: "Scope",
        active: listFilters.isActive("scope"),
        control: (
          <BuildFilterSelect
            label="Scope"
            value={listFilters.value("scope")}
            onValueChange={handleScopeChange}
            options={GOAL_SCOPE_FILTER_OPTIONS}
          />
        ),
      },
      {
        id: "health",
        label: "Health",
        active: healthValues.length > 0,
        control: (
          <BuildMultiFilterSelect
            label="Health"
            values={healthValues}
            onValuesChange={handleHealthValuesChange}
            options={GOAL_HEALTH_FILTER_OPTIONS.filter((o) => o.value !== BUILD_FILTER_ALL)}
          />
        ),
      },
      {
        id: "due",
        label: GOAL_DUE_FILTER_LABEL,
        active: listFilters.isActive("due"),
        control: (
          <DatePicker
            ariaLabel={GOAL_DUE_FILTER_LABEL}
            clearable
            value={dueValue === BUILD_FILTER_ALL ? "" : dueValue}
            onChange={handleDueChange}
            placeholder={GOAL_DUE_FILTER_LABEL}
            className="w-full min-w-0 max-w-none bg-card text-foreground"
          />
        ),
      },
      {
        id: "metric",
        label: "Metric",
        active: listFilters.isActive("metricType"),
        control: (
          <BuildFilterSelect
            label="Metric"
            value={listFilters.value("metricType")}
            onValueChange={handleMetricTypeChange}
            options={GOAL_METRIC_FILTER_OPTIONS}
          />
        ),
      },
    ],
    [
      listFilters,
      statusValues,
      healthValues,
      ownerValues,
      dueValue,
      resolvedOwnerOptions,
      handleLevelChange,
      handleStatusValuesChange,
      handleOwnerValuesChange,
      handleScopeChange,
      handleHealthValuesChange,
      handleDueChange,
      handleMetricTypeChange,
    ],
  );

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search goals…",
        label: "Search goals",
        inputRef: searchInputRef,
      }}
      filters={filters}
      onClearAll={listFilters.clearAll}
      trailing={trailing}
    />
  );
}
