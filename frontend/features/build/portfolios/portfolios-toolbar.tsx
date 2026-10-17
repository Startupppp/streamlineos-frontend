"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { BuildFilterOption } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

const HEALTH_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
] as const;

const SORT_OPTIONS = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "name", label: "Name" },
] as const;

export const PORTFOLIO_FILTER_DEFINITIONS = [
  { param: "status", options: STATUS_OPTIONS.map((o) => o.value) },
  { param: "health", options: HEALTH_OPTIONS.map((o) => o.value) },
  { param: "ownerId" },
  { param: "sort", all: "createdAt", options: SORT_OPTIONS.map((o) => o.value) },
] as const;

interface PortfoliosToolbarProps {
  listFilters: BuildListFiltersState;
  ownerOptions?: readonly BuildFilterOption[];
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function PortfoliosToolbar({
  listFilters,
  ownerOptions,
  searchInputRef,
}: PortfoliosToolbarProps) {
  const statusValue = listFilters.value("status");
  const healthValue = listFilters.value("health");
  const ownerIdValue = listFilters.value("ownerId");
  const sortValue = listFilters.value("sort");

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleHealthChange = useCallback(
    (value: string) => listFilters.setValue("health", value),
    [listFilters],
  );
  const handleOwnerChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value),
    [listFilters],
  );
  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );

  const resolvedOwnerOptions: readonly BuildFilterOption[] = ownerOptions
    ? [{ value: BUILD_FILTER_ALL, label: "All owners" }, ...ownerOptions]
    : [{ value: BUILD_FILTER_ALL, label: "All owners" }];

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search portfolios…",
        label: "Search portfolios",
        inputRef: searchInputRef,
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          active: listFilters.isActive("status"),
          control: (
            <BuildFilterSelect
              label="Status"
              value={statusValue}
              onValueChange={handleStatusChange}
              options={STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "health",
          label: "Health",
          active: listFilters.isActive("health"),
          control: (
            <BuildFilterSelect
              label="Health"
              value={healthValue}
              onValueChange={handleHealthChange}
              options={HEALTH_OPTIONS}
            />
          ),
        },
        {
          id: "owner",
          label: "Owner",
          active: listFilters.isActive("ownerId"),
          control: (
            <BuildFilterSelect
              label="Owner"
              value={ownerIdValue}
              onValueChange={handleOwnerChange}
              options={resolvedOwnerOptions}
            />
          ),
        },
        {
          id: "sort",
          label: "Sort",
          active: listFilters.isActive("sort"),
          control: (
            <BuildFilterSelect
              label="Sort portfolios"
              value={sortValue}
              onValueChange={handleSortChange}
              options={SORT_OPTIONS}
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );
}
