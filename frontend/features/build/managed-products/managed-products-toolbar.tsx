"use client";

import { useCallback } from "react";
import { LayoutGrid, List } from "lucide-react";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMultiFilterSelect } from "@/features/build/shared/build-multi-filter-select";
import type { BuildListFiltersState } from "@/features/build/shared/use-build-list-filters";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { ManagedProductFilterChips } from "./managed-product-filter-chips";
import {
  STATUS_OPTIONS,
  SORT_OPTIONS,
  LIFECYCLE_FILTER_OPTIONS,
  HEALTH_FILTER_OPTIONS,
  ARCHIVED_FILTER_OPTIONS,
  type ManagedProductViewMode,
} from "./managed-products-filter-constants";

const MANAGED_PRODUCTS_VIEW_OPTIONS: ViewOption<ManagedProductViewMode>[] = [
  { value: "table", icon: List, label: "Table view" },
  { value: "grid", icon: LayoutGrid, label: "Grid view" },
];

interface ManagedProductsToolbarProps {
  listFilters: BuildListFiltersState;
  teamOptions: { value: string; label: string }[];
  ownerOptions: { value: string; label: string }[];
  segmentOptions: { value: string; label: string }[];
  tagOptions: { value: string; label: string }[];
  linkedProjectOptions: { value: string; label: string }[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  viewMode: ManagedProductViewMode;
  onViewModeChange: (mode: ManagedProductViewMode) => void;
}

export function ManagedProductsToolbar({
  listFilters,
  teamOptions,
  ownerOptions,
  segmentOptions,
  tagOptions,
  linkedProjectOptions,
  searchInputRef,
  viewMode,
  onViewModeChange,
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

  const lifecycleValues = lifecycleValue && lifecycleValue !== BUILD_FILTER_ALL ? lifecycleValue.split(",") : [];
  const healthValues = healthValue && healthValue !== BUILD_FILTER_ALL ? healthValue.split(",") : [];
  const teamIdValues = teamIdValue && teamIdValue !== BUILD_FILTER_ALL ? teamIdValue.split(",") : [];
  const ownerIdValues = ownerIdValue && ownerIdValue !== BUILD_FILTER_ALL ? ownerIdValue.split(",") : [];
  const segmentValues = segmentValue && segmentValue !== BUILD_FILTER_ALL ? segmentValue.split(",") : [];
  const tagValues = tagValue && tagValue !== BUILD_FILTER_ALL ? tagValue.split(",") : [];

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );
  const handleLifecycleChange = useCallback(
    (values: string[]) => listFilters.setValue("lifecycle", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleHealthChange = useCallback(
    (values: string[]) => listFilters.setValue("health", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleTeamChange = useCallback(
    (values: string[]) => listFilters.setValue("teamId", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleOwnerChange = useCallback(
    (values: string[]) => listFilters.setValue("ownerId", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleSegmentChange = useCallback(
    (values: string[]) => listFilters.setValue("segment", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleTagChange = useCallback(
    (values: string[]) => listFilters.setValue("tag", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
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
              <BuildMultiFilterSelect
                label="Lifecycle"
                values={lifecycleValues}
                onValuesChange={handleLifecycleChange}
                options={LIFECYCLE_FILTER_OPTIONS.filter((o) => o.value !== BUILD_FILTER_ALL)}
              />
            ),
          },
          {
            id: "health",
            label: "Health",
            active: listFilters.isActive("health"),
            control: (
              <BuildMultiFilterSelect
                label="Health"
                values={healthValues}
                onValuesChange={handleHealthChange}
                options={HEALTH_FILTER_OPTIONS.filter((o) => o.value !== BUILD_FILTER_ALL)}
              />
            ),
          },
          {
            id: "teamId",
            label: "Team",
            active: listFilters.isActive("teamId"),
            control: (
              <BuildMultiFilterSelect
                label="Team"
                values={teamIdValues}
                onValuesChange={handleTeamChange}
                options={teamOptions}
              />
            ),
          },
          {
            id: "ownerId",
            label: "Owner",
            active: listFilters.isActive("ownerId"),
            control: (
              <BuildMultiFilterSelect
                label="Owner"
                values={ownerIdValues}
                onValuesChange={handleOwnerChange}
                options={ownerOptions}
              />
            ),
          },
          {
            id: "segment",
            label: "Segment",
            active: listFilters.isActive("segment"),
            control: (
              <BuildMultiFilterSelect
                label="Segment"
                values={segmentValues}
                onValuesChange={handleSegmentChange}
                options={segmentOptions}
              />
            ),
          },
          {
            id: "tag",
            label: "Tag",
            active: listFilters.isActive("tag"),
            control: (
              <BuildMultiFilterSelect
                label="Tag"
                values={tagValues}
                onValuesChange={handleTagChange}
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
        trailing={
          <ViewToggle
            value={viewMode}
            options={MANAGED_PRODUCTS_VIEW_OPTIONS}
            onChange={onViewModeChange}
          />
        }
      />
      <ManagedProductFilterChips
        listFilters={listFilters}
        statusValue={statusValue}
        lifecycleValues={lifecycleValues}
        healthValues={healthValues}
        teamIdValues={teamIdValues}
        ownerIdValues={ownerIdValues}
        segmentValues={segmentValues}
        tagValues={tagValues}
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
