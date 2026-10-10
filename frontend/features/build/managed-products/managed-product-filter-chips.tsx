"use client";

import { FilterChip } from "@/features/build/shared/filter-chip";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { BuildListFiltersState } from "@/features/build/shared/use-build-list-filters";

interface ActiveFilter {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface ManagedProductFilterChipsProps {
  listFilters: BuildListFiltersState;
  statusValue: string;
  lifecycleValue: string;
  healthValue: string;
  teamIdValue: string;
  ownerIdValue: string;
  segmentValue: string;
  tagValue: string;
  linkedProjectIdValue: string;
  archivedValue: string;
  ownerOptions: { value: string; label: string }[];
  teamOptions: { value: string; label: string }[];
  linkedProjectOptions: { value: string; label: string }[];
  onClearStatus: (v: string) => void;
  onClearLifecycle: (v: string) => void;
  onClearHealth: (v: string) => void;
  onClearTeam: (v: string) => void;
  onClearOwner: (v: string) => void;
  onClearSegment: (v: string) => void;
  onClearTag: (v: string) => void;
  onClearLinkedProject: (v: string) => void;
  onClearArchived: (v: string) => void;
}

export function ManagedProductFilterChips({
  listFilters,
  statusValue,
  lifecycleValue,
  healthValue,
  teamIdValue,
  ownerIdValue,
  segmentValue,
  tagValue,
  linkedProjectIdValue,
  archivedValue,
  ownerOptions,
  teamOptions,
  linkedProjectOptions,
  onClearStatus,
  onClearLifecycle,
  onClearHealth,
  onClearTeam,
  onClearOwner,
  onClearSegment,
  onClearTag,
  onClearLinkedProject,
  onClearArchived,
}: ManagedProductFilterChipsProps) {
  const chips: ActiveFilter[] = [];

  if (statusValue && statusValue !== BUILD_FILTER_ALL) {
    chips.push({
      id: "status",
      label: "Status",
      value: statusValue,
      onRemove: () => onClearStatus(BUILD_FILTER_ALL),
    });
  }

  if (lifecycleValue && lifecycleValue !== BUILD_FILTER_ALL) {
    chips.push({
      id: "lifecycle",
      label: "Lifecycle",
      value: lifecycleValue,
      onRemove: () => onClearLifecycle(BUILD_FILTER_ALL),
    });
  }

  if (healthValue && healthValue !== BUILD_FILTER_ALL) {
    chips.push({
      id: "health",
      label: "Health",
      value: healthValue.replace(/_/g, " "),
      onRemove: () => onClearHealth(BUILD_FILTER_ALL),
    });
  }

  if (teamIdValue && teamIdValue !== BUILD_FILTER_ALL) {
    const teamLabel = teamOptions.find((t) => t.value === teamIdValue)?.label ?? teamIdValue;
    chips.push({
      id: "team",
      label: "Team",
      value: teamLabel,
      onRemove: () => onClearTeam(BUILD_FILTER_ALL),
    });
  }

  if (ownerIdValue && ownerIdValue !== BUILD_FILTER_ALL) {
    const ownerLabel = ownerOptions.find((o) => o.value === ownerIdValue)?.label ?? ownerIdValue;
    chips.push({
      id: "owner",
      label: "Owner",
      value: ownerLabel,
      onRemove: () => onClearOwner(BUILD_FILTER_ALL),
    });
  }

  if (segmentValue && segmentValue !== BUILD_FILTER_ALL) {
    chips.push({
      id: "segment",
      label: "Segment",
      value: segmentValue,
      onRemove: () => onClearSegment(BUILD_FILTER_ALL),
    });
  }

  if (tagValue && tagValue !== BUILD_FILTER_ALL) {
    chips.push({
      id: "tag",
      label: "Tag",
      value: tagValue,
      onRemove: () => onClearTag(BUILD_FILTER_ALL),
    });
  }

  if (linkedProjectIdValue && linkedProjectIdValue !== BUILD_FILTER_ALL) {
    const projectLabel =
      linkedProjectOptions.find((p) => p.value === linkedProjectIdValue)?.label ??
      linkedProjectIdValue;
    chips.push({
      id: "linkedProject",
      label: "Project",
      value: projectLabel,
      onRemove: () => onClearLinkedProject(BUILD_FILTER_ALL),
    });
  }

  if (archivedValue && archivedValue !== BUILD_FILTER_ALL) {
    chips.push({
      id: "archived",
      label: "Archived",
      value: "Yes",
      onRemove: () => onClearArchived(BUILD_FILTER_ALL),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
      {chips.map((chip) => (
        <FilterChip
          key={chip.id}
          label={chip.label}
          value={chip.value}
          onRemove={chip.onRemove}
        />
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={listFilters.clearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
