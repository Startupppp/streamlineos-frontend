"use client";

import { useCallback, useMemo, type RefObject } from "react";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  type useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { getUserDisplayName } from "@/lib/person-display";

export const EPIC_HEALTH_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Any health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
] as const;

export const EPIC_FILTER_DEFINITIONS = [
  { param: "status" },
  { param: "ownerId" },
  { param: "health", options: EPIC_HEALTH_OPTIONS.map((o) => o.value) },
] as const;

type ListFilters = ReturnType<typeof useBuildListFilters>;

interface EpicsFilterToolbarProps {
  listFilters: ListFilters;
  searchInputRef: RefObject<HTMLInputElement | null>;
  projectStatuses?: Array<{ name: string }>;
  members: Array<{ id: string; name?: string | null; firstName?: string | null; lastName?: string | null }>;
}

export function EpicsFilterToolbar({
  listFilters,
  searchInputRef,
  projectStatuses,
  members,
}: EpicsFilterToolbarProps) {
  const statusOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All statuses" },
      ...(projectStatuses ?? []).map((s) => ({ value: s.name, label: s.name })),
    ],
    [projectStatuses],
  );

  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All owners" },
      ...members.map((member) => ({
        value: member.id,
        label: getUserDisplayName(member),
      })),
    ],
    [members],
  );

  const handleStatusFilterChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleOwnerFilterChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value),
    [listFilters],
  );
  const handleHealthFilterChange = useCallback(
    (value: string) => listFilters.setValue("health", value),
    [listFilters],
  );

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search epics",
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
              value={listFilters.value("status")}
              onValueChange={handleStatusFilterChange}
              options={statusOptions}
            />
          ),
        },
        {
          id: "ownerId",
          label: "Owner",
          active: listFilters.isActive("ownerId"),
          control: (
            <BuildFilterSelect
              label="Owner"
              value={listFilters.value("ownerId")}
              onValueChange={handleOwnerFilterChange}
              options={ownerOptions}
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
              value={listFilters.value("health")}
              onValueChange={handleHealthFilterChange}
              options={EPIC_HEALTH_OPTIONS}
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );
}
