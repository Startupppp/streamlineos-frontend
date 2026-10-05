"use client";

import { useMemo } from "react";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getUserDisplayName } from "@/lib/person-display";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { FilterChip } from "@/components/list-view/filter-chip";
import { useTicketFilterParams } from "./use-ticket-filter-params";

export interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
  email?: string | null;
}

export interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

function formatDueRange(from: string, to: string): string {
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}

interface TicketFilterChipsProps {
  members?: Member[];
  projectId?: number;
  projectOptions?: ProjectOption[];
}

export function TicketFilterChips({
  members = [],
  projectId,
  projectOptions,
}: TicketFilterChipsProps) {
  const { iconRef: clearAllIconRef, hoverHandlers: clearAllHoverHandlers } =
    useAnimatedIcon();

  const {
    activeFilterCount,
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    dueDateFrom,
    dueDateTo,
    makeRemoveStatus,
    makeRemovePriority,
    makeRemoveType,
    makeRemoveAssignee,
    makeRemoveLabel,
    makeRemoveCycle,
    makeRemoveProject,
    handleRemoveDueDate,
    clearAll,
  } = useTicketFilterParams();

  const { data: labels = [] } = useProjectLabels(projectId, {
    enabled: selectedLabels.length > 0,
  });
  const { data: cycles = [] } = useCycles(
    selectedCycles.length > 0 ? (projectId ?? 0) : 0,
  );

  const labelMap = useMemo(
    () => new Map(labels.map((l) => [String(l.id), l])),
    [labels],
  );
  const cycleMap = useMemo(
    () => new Map(cycles.map((c) => [String(c.id), c])),
    [cycles],
  );
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const projectMap = useMemo(
    () => new Map((projectOptions ?? []).map((p) => [String(p.id), p])),
    [projectOptions],
  );

  if (activeFilterCount === 0) return null;

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 [&>*]:shrink-0">
        {selectedStatuses.map((s) => (
          <FilterChip
            key={`status-${s}`}
            label={s.replace(/_/g, " ")}
            onRemove={makeRemoveStatus(s)}
          />
        ))}
        {selectedPriorities.map((p) => (
          <FilterChip
            key={`priority-${p}`}
            label={p.charAt(0) + p.slice(1).toLowerCase()}
            onRemove={makeRemovePriority(p)}
          />
        ))}
        {selectedTypes.map((t) => (
          <FilterChip
            key={`type-${t}`}
            label={t.charAt(0) + t.slice(1).toLowerCase()}
            onRemove={makeRemoveType(t)}
          />
        ))}
        {selectedAssignees.map((id) => {
          const member = memberMap.get(id);
          const label =
            id === "@me"
              ? "Me"
              : id === "__unassigned__"
                ? "Unassigned"
                : member
                  ? getUserDisplayName(member)
                  : id;
          return (
            <FilterChip
              key={`assignee-${id}`}
              label={label}
              onRemove={makeRemoveAssignee(id)}
            />
          );
        })}
        {selectedLabels.map((id) => {
          const l = labelMap.get(id);
          return (
            <FilterChip
              key={`label-${id}`}
              label={l?.name ?? id}
              color={l?.color ?? undefined}
              onRemove={makeRemoveLabel(id)}
            />
          );
        })}
        {selectedCycles.map((id) => {
          const c = cycleMap.get(id);
          return (
            <FilterChip
              key={`cycle-${id}`}
              label={c?.name ?? id}
              onRemove={makeRemoveCycle(id)}
            />
          );
        })}
        {selectedProjectIds.map((id) => {
          const p = projectMap.get(id);
          return (
            <FilterChip
              key={`project-${id}`}
              label={p?.name ?? id}
              onRemove={makeRemoveProject(id)}
            />
          );
        })}
        {dueDateFrom || dueDateTo ? (
          <FilterChip
            key="due-date"
            label={formatDueRange(dueDateFrom, dueDateTo)}
            onRemove={handleRemoveDueDate}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={clearAll}
        className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        aria-label="Clear all filters"
        {...clearAllHoverHandlers}
      >
        <XIcon ref={clearAllIconRef} size={12} className="shrink-0" />
        <span>Clear</span>
      </button>
    </div>
  );
}
