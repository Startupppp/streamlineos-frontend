"use client";

import { useCallback } from "react";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { BuildListFiltersState } from "@/features/build/shared/use-build-list-filters";
import { ManagedProductFilterChips } from "./managed-product-filter-chips";
import {
  STATUS_OPTIONS,
  SORT_OPTIONS,
  LIFECYCLE_FILTER_OPTIONS,
  HEALTH_FILTER_OPTIONS,
  ARCHIVED_FILTER_OPTIONS,
} from "./managed-products-filter-constants";

interface ManagedProductsToolbarProps {
  listFilters: BuildListFiltersState;
  teamOptions: { value: string; label: string }[];
  ownerOptions: { value: string; label: string }[];
  segmentOptions: { value: string; label: string }[];
  tagOptions: { value: string; label: string }[];
  linkedProjectOptions: { value: string; label: string }[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ManagedProductsToolbar({
  listFilters,
  teamOptions,
  ownerOptions,
  segmentOptions,
  tagOptions,
  linkedProjectOptions,
  searchInputRef,
}: ManagedProductsToolbarProps) {
  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");
  const lifecycleValue = listFilters.value("lifecycle");
  const healthValue = listFilters.value("health");
  const teamIdValue = listFilters.value("teamId");
  const ownerIdValue = listFilters.value("ownerId");
  const segmentValue = listFilters.value("segment");
  const tagValue = listFilters.value("tag");
  const linkedProjectIdValue = listFilters.value("linkedProjectId");
  const archivedValue = listFilters.value("archived");

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );
  const handleLifecycleChange = useCallback(
    (value: string) => listFilters.setValue("lifecycle", value),
    [listFilters],
  );
  const handleHealthChange = useCallback(
    (value: string) => listFilters.setValue("health", value),
    [listFilters],
  );
  const handleTeamChange = useCallback(
    (value: string) => listFilters.setValue("teamId", value),
    [listFilters],
  );
  const handleOwnerChange = useCallback(
    (value: string) => listFilters.setValue("ownerId", value),
    [listFilters],
  );
  const handleSegmentChange = useCallback(
    (value: string) => listFilters.setValue("segment", value),
    [listFilters],
  );
  const handleTagChange = useCallback(
    (value: string) => listFilters.setValue("tag", value),
    [listFilters],
  );
  const handleLinkedProjectChange = useCallback(
    (value: string) => listFilters.setValue("linkedProjectId", value),
    [listFilters],
  );
  const handleArchivedChange = useCallback(
    (value: string) => listFilters.setValue("archived", value),
    [listFilters],
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <BuildListToolbar
        collapseActionsOnSearchFocus
        row={{ mobile: 1, tablet: 3, desktop: 5 }}
        search={{
          value: listFilters.search,
          onValueChange: listFilters.setSearch,
          placeholder: "Search by name or key…",
          label: "Search products",
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
            id: "lifecycle",
            label: "Lifecycle",
            active: listFilters.isActive("lifecycle"),
            control: (
              <BuildFilterSelect
                label="Lifecycle"
                value={lifecycleValue}
                onValueChange={handleLifecycleChange}
                options={LIFECYCLE_FILTER_OPTIONS}
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
                options={HEALTH_FILTER_OPTIONS}
              />
            ),
          },
          {
            id: "teamId",
            label: "Team",
            active: listFilters.isActive("teamId"),
            control: (
              <BuildFilterSelect
                label="Team"
                value={teamIdValue}
                onValueChange={handleTeamChange}
                options={teamOptions}
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
                value={ownerIdValue}
                onValueChange={handleOwnerChange}
                options={ownerOptions}
              />
            ),
          },
          {
            id: "segment",
            label: "Segment",
            active: listFilters.isActive("segment"),
            control: (
              <BuildFilterSelect
                label="Segment"
                value={segmentValue}
                onValueChange={handleSegmentChange}
                options={segmentOptions}
              />
            ),
          },
          {
            id: "tag",
            label: "Tag",
            active: listFilters.isActive("tag"),
            control: (
              <BuildFilterSelect
                label="Tag"
                value={tagValue}
                onValueChange={handleTagChange}
                options={tagOptions}
              />
            ),
          },
          {
            id: "linkedProjectId",
            label: "Project",
            active: listFilters.isActive("linkedProjectId"),
            control: (
              <BuildFilterSelect
                label="Project"
                value={linkedProjectIdValue}
                onValueChange={handleLinkedProjectChange}
                options={linkedProjectOptions}
              />
            ),
          },
          {
            id: "archived",
            label: "Archived",
            active: listFilters.isActive("archived"),
            control: (
              <BuildFilterSelect
                label="Archived"
                value={archivedValue}
                onValueChange={handleArchivedChange}
                options={ARCHIVED_FILTER_OPTIONS}
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
                options={SORT_OPTIONS}
              />
            ),
          },
        ]}
        onClearAll={listFilters.clearAll}
      />
      <ManagedProductFilterChips
        listFilters={listFilters}
        statusValue={statusValue}
        lifecycleValue={lifecycleValue}
        healthValue={healthValue}
        teamIdValue={teamIdValue}
        ownerIdValue={ownerIdValue}
        segmentValue={segmentValue}
        tagValue={tagValue}
        linkedProjectIdValue={linkedProjectIdValue}
        archivedValue={archivedValue}
        ownerOptions={ownerOptions}
        teamOptions={teamOptions}
        linkedProjectOptions={linkedProjectOptions}
        onClearStatus={handleStatusChange}
        onClearLifecycle={handleLifecycleChange}
        onClearHealth={handleHealthChange}
        onClearTeam={handleTeamChange}
        onClearOwner={handleOwnerChange}
        onClearSegment={handleSegmentChange}
        onClearTag={handleTagChange}
        onClearLinkedProject={handleLinkedProjectChange}
        onClearArchived={handleArchivedChange}
      />
    </div>
  );
}
