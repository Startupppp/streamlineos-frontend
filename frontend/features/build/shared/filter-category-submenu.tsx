"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from "react";
import { getUserDisplayName } from "@/lib/person-display";
import { resolveColumnColor } from "@/lib/column-colors";
import { getStatusEntry, type StatusConfigEntry } from "@/lib/status-config";
import {
  FilterAssigneeLeading,
  FilterLabelDot,
  FilterPriorityLeading,
  FilterTypeLeading,
} from "./filter-option-leading";
import {
  OptionRow,
  FilterMenuSearch,
  PanelShell,
  EmptyHint,
  FilterDatesPanel,
} from "@/features/shared/list-view";
import {
  PRIORITIES,
  TYPES,
  type FilterCategory,
  type StatusFilterOption,
  type Member,
  type Label,
  type Cycle,
  type Sprint,
  type ProjectOption,
} from "@/features/shared/list-view";

export type { StatusFilterOption } from "@/features/shared/list-view";
export { StatusFilterDot } from "@/features/shared/list-view";

interface FilterCategorySubmenuProps {
  category: FilterCategory;
  statusItems: StatusFilterOption[];
  statusConfig: Record<string, StatusConfigEntry>;
  members: Member[];
  labels: Label[];
  cycles: Cycle[];
  sprints: Sprint[];
  projectOptions?: ProjectOption[];
  selectedStatuses: string[];
  selectedPriorities: string[];
  selectedTypes: string[];
  selectedAssignees: string[];
  selectedLabels: string[];
  selectedCycles: string[];
  selectedProjectIds: string[];
  sprintParam: string;
  dueDateFrom: string;
  dueDateTo: string;
  onToggleStatus: (v: string) => void;
  onTogglePriority: (v: string) => void;
  onToggleType: (v: string) => void;
  onToggleAssignee: (v: string) => void;
  onToggleLabel: (v: string) => void;
  onToggleCycle: (v: string) => void;
  onToggleSprint: (v: string) => void;
  onToggleProject: (v: string) => void;
  onDueDateFromChange: (v: string) => void;
  onDueDateToChange: (v: string) => void;
  onClose: () => void;
  showTitle?: boolean;
  className?: string;
  listClassName?: string;
}

export function FilterCategorySubmenu({
  category,
  statusItems,
  statusConfig,
  members,
  labels,
  cycles,
  sprints,
  projectOptions,
  selectedStatuses,
  selectedPriorities,
  selectedTypes,
  selectedAssignees,
  selectedLabels,
  selectedCycles,
  selectedProjectIds,
  sprintParam,
  dueDateFrom,
  dueDateTo,
  onToggleStatus,
  onTogglePriority,
  onToggleType,
  onToggleAssignee,
  onToggleLabel,
  onToggleCycle,
  onToggleSprint,
  onToggleProject,
  onDueDateFromChange,
  onDueDateToChange,
  onClose,
  showTitle = true,
  className,
  listClassName = "max-h-[min(50dvh,320px)] overflow-y-auto scrollbar-hide p-1",
}: FilterCategorySubmenuProps) {
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    containerRef.current?.focus();
  }, [category]);

  useEffect(() => {
    setSearch("");
  }, [category]);

  const needsSearch = category === "assignee" || category === "label" || category === "project";
  const q = search.toLowerCase();

  if (category === "dates") {
    return (
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown} showTitle={showTitle} className={className}>
        <FilterDatesPanel
          dueDateFrom={dueDateFrom}
          dueDateTo={dueDateTo}
          onDueDateFromChange={onDueDateFromChange}
          onDueDateToChange={onDueDateToChange}
        />
      </PanelShell>
    );
  }

  if (category === "status") {
    const filtered = statusItems.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.name.replace(/_/g, " ").toLowerCase().includes(q),
    );
    return (
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown} showTitle={showTitle} className={className}>
        <div className={listClassName}>
          {filtered.map((s) => {
            const label = s.name.replace(/_/g, " ");
            const entry = getStatusEntry(statusConfig, s.name);
            function handleClick() {
              onToggleStatus(s.name);
            }
            return (
              <OptionRow
                key={s.name}
                active={selectedStatuses.includes(s.name)}
                label={label}
                color={s.color ? resolveColumnColor(s.color) : undefined}
                dotClassName={s.color ? undefined : entry.dotColor}
                onClick={handleClick}
              />
            );
          })}
          {filtered.length === 0 ? <EmptyHint message="No options" /> : null}
        </div>
      </PanelShell>
    );
  }

  if (category === "priority") {
    return (
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown} showTitle={showTitle} className={className}>
        <div className={listClassName}>
          {PRIORITIES.map((p) => {
            const label = p.charAt(0) + p.slice(1).toLowerCase();
            function handleClick() {
              onTogglePriority(p);
            }
            return (
              <OptionRow
                key={p}
                active={selectedPriorities.includes(p)}
                label={label}
                leading={<FilterPriorityLeading priority={p} />}
                onClick={handleClick}
              />
            );
          })}
        </div>
      </PanelShell>
    );
  }

  if (category === "type") {
    return (
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown} showTitle={showTitle} className={className}>
        <div className={listClassName}>
          {TYPES.map((t) => {
            const label = t.charAt(0) + t.slice(1).toLowerCase();
            function handleClick() {
              onToggleType(t);
            }
            return (
              <OptionRow
                key={t}
                active={selectedTypes.includes(t)}
                label={label}
                leading={<FilterTypeLeading type={t} />}
                onClick={handleClick}
              />
            );
          })}
        </div>
      </PanelShell>
    );
  }

  if (category === "assignee") {
    const allMembers = [
      { id: "@me", displayName: "Me (dynamic)", member: null as Member | null },
      { id: "__unassigned__", displayName: "Unassigned", member: null as Member | null },
      ...members.map((m) => ({ id: m.id, displayName: getUserDisplayName(m), member: m })),
    ];
    const filtered = allMembers.filter(
      (m) => !q || m.displayName.toLowerCase().includes(q),
    );
    return (
      <PanelShell
        category={category}
        containerRef={containerRef}
        onKeyDown={handleKeyDown}
        withSearch
        showTitle={showTitle}
        className={className}
      >
        {needsSearch ? (
          <FilterMenuSearch
            value={search}
            onValueChange={setSearch}
            placeholder="Search assignees…"
          />
        ) : null}
        <div className={listClassName}>
          {filtered.map((m) => {
            function handleClick() {
              onToggleAssignee(m.id);
            }
            return (
              <OptionRow
                key={m.id}
                active={selectedAssignees.includes(m.id)}
                label={m.displayName}
                leading={<FilterAssigneeLeading assigneeId={m.id} member={m.member} />}
                onClick={handleClick}
              />
            );
          })}
          {filtered.length === 0 ? <EmptyHint message="No members" /> : null}
        </div>
      </PanelShell>
    );
  }

  if (category === "label") {
    const filtered = labels.filter(
      (l) => !q || l.name.toLowerCase().includes(q),
    );
    return (
      <PanelShell
        category={category}
        containerRef={containerRef}
        onKeyDown={handleKeyDown}
        withSearch
        showTitle={showTitle}
        className={className}
      >
        {needsSearch ? (
          <FilterMenuSearch
            value={search}
            onValueChange={setSearch}
            placeholder="Search labels…"
          />
        ) : null}
        <div className={listClassName}>
          {filtered.map((l) => {
            const labelId = String(l.id);
            function handleClick() {
              onToggleLabel(labelId);
            }
            return (
              <OptionRow
                key={l.id}
                active={selectedLabels.includes(labelId)}
                label={l.name}
                leading={<FilterLabelDot color={l.color} />}
                onClick={handleClick}
              />
            );
          })}
          {filtered.length === 0 ? <EmptyHint message="No labels" /> : null}
        </div>
      </PanelShell>
    );
  }

  if (category === "cycle") {
    return (
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown} showTitle={showTitle} className={className}>
        <div className={listClassName}>
          {cycles.map((c) => {
            const cycleId = String(c.id);
            function handleClick() {
              onToggleCycle(cycleId);
            }
            return (
              <OptionRow
                key={c.id}
                active={selectedCycles.includes(cycleId)}
                label={c.name}
                onClick={handleClick}
              />
            );
          })}
          {cycles.length === 0 ? <EmptyHint message="No cycles" /> : null}
        </div>
      </PanelShell>
    );
  }

  if (category === "sprint") {
    return (
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown} showTitle={showTitle} className={className}>
        <div className={listClassName}>
          {sprints.map((s) => {
            const sprintId = String(s.id);
            function handleClick() {
              onToggleSprint(sprintId);
            }
            return (
              <OptionRow
                key={s.id}
                active={sprintParam === sprintId}
                label={s.name}
                onClick={handleClick}
              />
            );
          })}
          {sprints.length === 0 ? <EmptyHint message="No sprints" /> : null}
        </div>
      </PanelShell>
    );
  }

  if (category === "project") {
    const projects = projectOptions ?? [];
    const filtered = projects.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q),
    );
    return (
      <PanelShell
        category={category}
        containerRef={containerRef}
        onKeyDown={handleKeyDown}
        withSearch
        showTitle={showTitle}
        className={className}
      >
        {needsSearch ? (
          <FilterMenuSearch
            value={search}
            onValueChange={setSearch}
            placeholder="Search projects…"
          />
        ) : null}
        <div className={listClassName}>
          {filtered.map((p) => {
            const projectId = String(p.id);
            function handleClick() {
              onToggleProject(projectId);
            }
            return (
              <OptionRow
                key={p.id}
                active={selectedProjectIds.includes(projectId)}
                label={p.name}
                onClick={handleClick}
              />
            );
          })}
          {filtered.length === 0 ? <EmptyHint message="No projects" /> : null}
        </div>
      </PanelShell>
    );
  }

  return null;
}
