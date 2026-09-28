"use client";

import { useCallback } from "react";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { BuildFilterOption } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";

export const COMMAND_CENTER_FILTER_DEFINITIONS = [
  {
    param: "scope",
    all: "mine",
    options: ["all", "mine", "created", "subscribed"],
  },
  { param: "owner" },
  { param: "due", options: ["overdue", "today", "week"] },
] as const;

const SCOPE_OPTIONS = [
  { value: "mine", label: "Assigned to me" },
  { value: "all", label: "All issues" },
  { value: "created", label: "Created by me" },
  { value: "subscribed", label: "Subscribed" },
] as const;

const DUE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Any date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
] as const;

interface CommandCenterToolbarProps {
  ownerOptions?: readonly BuildFilterOption[];
}

export function CommandCenterToolbar({
  ownerOptions,
}: CommandCenterToolbarProps) {
  const listFilters = useBuildListFilters({
    withSearch: false,
    filters: COMMAND_CENTER_FILTER_DEFINITIONS,
  });

  const scopeValue = listFilters.value("scope");
  const ownerValue = listFilters.value("owner");
  const dueValue = listFilters.value("due");

  const handleScopeChange = useCallback(
    (value: string) => listFilters.setValue("scope", value),
    [listFilters],
  );
  const handleOwnerChange = useCallback(
    (value: string) => listFilters.setValue("owner", value),
    [listFilters],
  );
  const handleDueChange = useCallback(
    (value: string) => listFilters.setValue("due", value),
    [listFilters],
  );

  const resolvedOwnerOptions: readonly BuildFilterOption[] = ownerOptions
    ? [{ value: BUILD_FILTER_ALL, label: "Any owner" }, ...ownerOptions]
    : [{ value: BUILD_FILTER_ALL, label: "Any owner" }];

  return (
    <BuildListToolbar
      filters={[
        {
          id: "scope",
          label: "Scope",
          active: listFilters.isActive("scope"),
          control: (
            <BuildFilterSelect
              label="Issue scope"
              value={scopeValue}
              onValueChange={handleScopeChange}
              options={SCOPE_OPTIONS}
            />
          ),
        },
        {
          id: "owner",
          label: "Owner",
          active: listFilters.isActive("owner"),
          control: (
            <BuildFilterSelect
              label="Project owner"
              value={ownerValue}
              onValueChange={handleOwnerChange}
              options={resolvedOwnerOptions}
            />
          ),
        },
        {
          id: "due",
          label: "Due",
          active: listFilters.isActive("due"),
          control: (
            <BuildFilterSelect
              label="Due date"
              value={dueValue}
              onValueChange={handleDueChange}
              options={DUE_OPTIONS}
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );
}
