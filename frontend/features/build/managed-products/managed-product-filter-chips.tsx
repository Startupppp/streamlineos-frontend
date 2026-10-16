"use client";

import { useCallback } from "react";
import { FilterChip } from "@/features/build/shared/filter-chip";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { BuildListFiltersState } from "@/features/build/shared/use-build-list-filters";
import { LIFECYCLE_FILTER_OPTIONS, HEALTH_FILTER_OPTIONS, STATUS_OPTIONS } from "./managed-products-filter-constants";

interface ActiveFilter {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface ManagedProductFilterChipsProps {
  listFilters: BuildListFiltersState;
  statusValue: string;
  lifecycleValues: string[];
  healthValues: string[];
  teamIdValues: string[];
  ownerIdValues: string[];
  segmentValues: string[];
  tagValues: string[];
  linkedProjectIdValue: string;
  archivedValue: string;
  ownerOptions: { value: string; label: string }[];
  teamOptions: { value: string; label: string }[];
  linkedProjectOptions: { value: string; label: string }[];
  onClearStatus: (v: string) => void;
  onClearLifecycle: (values: string[]) => void;
  onClearHealth: (values: string[]) => void;
  onClearTeam: (values: string[]) => void;
  onClearOwner: (values: string[]) => void;
  onClearSegment: (values: string[]) => void;
  onClearTag: (values: string[]) => void;
  onClearLinkedProject: (v: string) => void;
  onClearArchived: (v: string) => void;
}

function removeValue(values: string[], toRemove: string): string[] {
  return values.filter((v) => v !== toRemove);
}

export function ManagedProductFilterChips({
  listFilters,
  statusValue,
  lifecycleValues,
  healthValues,
  teamIdValues,
  ownerIdValues,
  segmentValues,
  tagValues,
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
      value: STATUS_OPTIONS.find((o) => o.value === statusValue)?.label ?? statusValue,
      onRemove: () => onClearStatus(BUILD_FILTER_ALL),
    });
  }

  for (const lc of lifecycleValues) {
    const label = LIFECYCLE_FILTER_OPTIONS.find((o) => o.value === lc)?.label ?? lc;
    chips.push({
      id: `lifecycle:${lc}`,
      label: "Lifecycle",
      value: label,
      onRemove: () => onClearLifecycle(removeValue(lifecycleValues, lc)),
    });
  }

  for (const h of healthValues) {
    const label = HEALTH_FILTER_OPTIONS.find((o) => o.value === h)?.label ?? h.replace(/_/g, " ");
    chips.push({
      id: `health:${h}`,
      label: "Health",
      value: label,
      onRemove: () => onClearHealth(removeValue(healthValues, h)),
    });
  }

  for (const tid of teamIdValues) {
    const teamLabel = teamOptions.find((t) => t.value === tid)?.label ?? tid;
    chips.push({
      id: `team:${tid}`,
      label: "Team",
      value: teamLabel,
      onRemove: () => onClearTeam(removeValue(teamIdValues, tid)),
    });
  }

  for (const oid of ownerIdValues) {
    const ownerLabel = ownerOptions.find((o) => o.value === oid)?.label ?? oid;
    chips.push({
      id: `owner:${oid}`,
      label: "Owner",
      value: ownerLabel,
      onRemove: () => onClearOwner(removeValue(ownerIdValues, oid)),
    });
  }

  for (const seg of segmentValues) {
    chips.push({
      id: `segment:${seg}`,
      label: "Segment",
      value: seg,
      onRemove: () => onClearSegment(removeValue(segmentValues, seg)),
    });
  }

  for (const t of tagValues) {
    chips.push({
      id: `tag:${t}`,
      label: "Tag",
      value: t,
      onRemove: () => onClearTag(removeValue(tagValues, t)),
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

export function useChipHandlers(listFilters: BuildListFiltersState) {
  const handleClearStatus = useCallback((v: string) => listFilters.setValue("status", v), [listFilters]);
  const handleClearLifecycle = useCallback(
    (values: string[]) => listFilters.setValue("lifecycle", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleClearHealth = useCallback(
    (values: string[]) => listFilters.setValue("health", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleClearTeam = useCallback(
    (values: string[]) => listFilters.setValue("teamId", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleClearOwner = useCallback(
    (values: string[]) => listFilters.setValue("ownerId", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleClearSegment = useCallback(
    (values: string[]) => listFilters.setValue("segment", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleClearTag = useCallback(
    (values: string[]) => listFilters.setValue("tag", values.length > 0 ? values.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleClearLinkedProject = useCallback((v: string) => listFilters.setValue("linkedProjectId", v), [listFilters]);
  const handleClearArchived = useCallback((v: string) => listFilters.setValue("archived", v), [listFilters]);

  return {
    handleClearStatus,
    handleClearLifecycle,
    handleClearHealth,
    handleClearTeam,
    handleClearOwner,
    handleClearSegment,
    handleClearTag,
    handleClearLinkedProject,
    handleClearArchived,
  };
}
