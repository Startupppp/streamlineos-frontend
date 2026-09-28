"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  BuildFilterSelect,
  BUILD_FILTER_TRIGGER_CLASS,
  type BuildFilterOption,
} from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";

export const GOAL_SCOPE_VALUES = ["own", "all"] as const;
export const GOAL_HEALTH_VALUES = ["on_track", "at_risk", "off_track"] as const;

const GOAL_DUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const GOAL_SCOPE_FILTER_OPTIONS: readonly BuildFilterOption[] = [
  { value: BUILD_FILTER_ALL, label: "All goals" },
  { value: "own", label: "My goals" },
];

export const GOAL_HEALTH_FILTER_OPTIONS: readonly BuildFilterOption[] = [
  { value: BUILD_FILTER_ALL, label: "Any health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
];

export const GOAL_DUE_FILTER_LABEL = "Due on or before";

export interface GoalOutcomeParams {
  health?: (typeof GOAL_HEALTH_VALUES)[number];
  scope?: (typeof GOAL_SCOPE_VALUES)[number];
  due?: string;
}

export function resolveGoalOutcomeParams(
  read: (param: string) => string,
): GoalOutcomeParams {
  const params: GoalOutcomeParams = {};
  const health = read("health");
  const scope = read("scope");
  const due = read("due");
  if ((GOAL_HEALTH_VALUES as readonly string[]).includes(health)) {
    params.health = health as GoalOutcomeParams["health"];
  }
  if (scope === "own") params.scope = "own";
  if (GOAL_DUE_PATTERN.test(due)) params.due = due;
  return params;
}

interface ProductGoalOutcomeFiltersProps {
  listFilters: Pick<BuildListFiltersState, "value" | "setValue">;
}

export function ProductGoalOutcomeFilters({
  listFilters,
}: ProductGoalOutcomeFiltersProps) {
  const { value, setValue } = listFilters;

  const handleScopeChange = useCallback(
    (next: string) => setValue("scope", next),
    [setValue],
  );

  const handleHealthChange = useCallback(
    (next: string) => setValue("health", next),
    [setValue],
  );

  const handleDueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue("due", event.target.value || BUILD_FILTER_ALL),
    [setValue],
  );

  const dueValue = value("due");

  return (
    <div
      data-slot="product-goal-outcome-filters"
      className="flex flex-wrap items-center gap-2"
    >
      <BuildFilterSelect
        label="Scope"
        value={value("scope")}
        onValueChange={handleScopeChange}
        options={GOAL_SCOPE_FILTER_OPTIONS}
      />
      <BuildFilterSelect
        label="Health"
        value={value("health")}
        onValueChange={handleHealthChange}
        options={GOAL_HEALTH_FILTER_OPTIONS}
      />
      <Input
        type="date"
        aria-label={GOAL_DUE_FILTER_LABEL}
        value={dueValue === BUILD_FILTER_ALL ? "" : dueValue}
        onChange={handleDueChange}
        className={BUILD_FILTER_TRIGGER_CLASS}
      />
    </div>
  );
}
