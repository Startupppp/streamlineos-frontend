"use client";

import { useCallback } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import type { RefObject } from "react";

const MILESTONE_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "MISSED", label: "Missed" },
] as const;

interface MilestonesFilterToolbarProps {
  listFilters: ReturnType<typeof useBuildListFilters>;
  ownerOptions: { value: string; label: string }[];
  statusFilterValue: string;
  ownerId: number | undefined;
  fromValue: string | undefined;
  toValue: string | undefined;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function MilestonesFilterToolbar({
  listFilters,
  ownerOptions,
  statusFilterValue,
  ownerId,
  fromValue,
  toValue,
  searchInputRef,
}: MilestonesFilterToolbarProps) {
  const handleStatusFilterChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleOwnerFilterChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value === BUILD_FILTER_ALL ? "" : value),
    [listFilters],
  );

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search milestones…",
        label: "Search milestones",
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
              value={statusFilterValue}
              onValueChange={handleStatusFilterChange}
              options={MILESTONE_STATUS_OPTIONS}
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
              value={ownerId !== undefined ? String(ownerId) : BUILD_FILTER_ALL}
              onValueChange={handleOwnerFilterChange}
              options={ownerOptions}
            />
          ),
        },
        {
          id: "date-range",
          label: "Date range",
          active: listFilters.isActive("from") || listFilters.isActive("to"),
          control: (
            <DateRangePicker
              from={fromValue}
              to={toValue}
              onChange={listFilters.setValues}
              placeholder="Filter by target date…"
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );
}
