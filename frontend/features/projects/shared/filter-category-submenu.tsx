"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Check, Search, CalendarRange } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import {
  FilterAssigneeLeading,
  FilterLabelDot,
  FilterPriorityLeading,
  FilterTypeLeading,
} from "./filter-option-leading";
import { resolveColumnColor } from "@/features/projects/shared/column-colors";
import {
  getStatusEntry,
  type StatusConfigEntry,
} from "@/features/projects/shared/types";

export interface StatusFilterOption {
  name: string;
  color: string | null;
  type?: string | null;
}

interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
  email?: string | null;
}

interface Label {
  id: number;
  name: string;
  color?: string | null;
}

interface Cycle {
  id: number;
  name: string;
}

interface Sprint {
  id: number;
  name: string;
}

export type FilterCategory =
  | "status"
  | "priority"
  | "type"
  | "assignee"
  | "label"
  | "cycle"
  | "sprint"
  | "dates"
  | "project";

interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

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
  onToggleStatus: (v: string) => void;
  onTogglePriority: (v: string) => void;
  onToggleType: (v: string) => void;
  onToggleAssignee: (v: string) => void;
  onToggleLabel: (v: string) => void;
  onToggleCycle: (v: string) => void;
  onToggleSprint: (v: string) => void;
  onToggleProject: (v: string) => void;
  onClose: () => void;
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;

function OptionRow({
  active,
  label,
  color,
  dotClassName,
  leading,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string | null;
  dotClassName?: string;
  leading?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:bg-accent"
    >
      <Check
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-opacity motion-reduce:transition-none",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      {leading}
      {!leading && color ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : !leading && dotClassName ? (
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClassName)} />
      ) : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function StatusFilterDot({
  status,
  config,
  className = "h-2 w-2 shrink-0 rounded-full",
}: {
  status: StatusFilterOption;
  config: Record<string, StatusConfigEntry>;
  className?: string;
}) {
  const entry = getStatusEntry(config, status.name);
  if (status.color) {
    return (
      <span
        className={className}
        style={{ backgroundColor: resolveColumnColor(status.color) }}
      />
    );
  }
  return <span className={cn(className, entry.dotColor)} />;
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
      <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
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
  onToggleStatus,
  onTogglePriority,
  onToggleType,
  onToggleAssignee,
  onToggleLabel,
  onToggleCycle,
  onToggleSprint,
  onToggleProject,
  onClose,
}: FilterCategorySubmenuProps) {
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
  }, []);

  const needsSearch = category === "assignee" || category === "label" || category === "project";
  const q = search.toLowerCase();

  if (category === "status") {
    const filtered = statusItems.filter((s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.name.replace(/_/g, " ").toLowerCase().includes(q),
    );
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[160px] flex-col py-1 outline-none"
      >
        {filtered.map((s) => {
          const label = s.name.replace(/_/g, " ");
          const entry = getStatusEntry(statusConfig, s.name);
          function handleClick() { onToggleStatus(s.name); }
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
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No options</p>
        )}
      </div>
    );
  }

  if (category === "priority") {
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[160px] flex-col py-1 outline-none"
      >
        {PRIORITIES.map((p) => {
          const label = p.charAt(0) + p.slice(1).toLowerCase();
          function handleClick() { onTogglePriority(p); }
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
    );
  }

  if (category === "type") {
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[160px] flex-col py-1 outline-none"
      >
        {TYPES.map((t) => {
          const label = t.charAt(0) + t.slice(1).toLowerCase();
          function handleClick() { onToggleType(t); }
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
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[180px] flex-col outline-none"
      >
        {needsSearch && (
          <SearchInput value={search} onChange={setSearch} placeholder="Search assignees..." />
        )}
        <div className="max-h-[200px] overflow-y-auto py-1">
          {filtered.map((m) => {
            function handleClick() { onToggleAssignee(m.id); }
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
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No members</p>
          )}
        </div>
      </div>
    );
  }

  if (category === "label") {
    const filtered = labels.filter(
      (l) => !q || l.name.toLowerCase().includes(q),
    );
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[180px] flex-col outline-none"
      >
        {needsSearch && (
          <SearchInput value={search} onChange={setSearch} placeholder="Search labels..." />
        )}
        <div className="max-h-[200px] overflow-y-auto py-1">
          {filtered.map((l) => {
            const labelId = String(l.id);
            function handleClick() { onToggleLabel(labelId); }
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
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No labels</p>
          )}
        </div>
      </div>
    );
  }

  if (category === "cycle") {
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[160px] flex-col py-1 outline-none"
      >
        {cycles.map((c) => {
          const cycleId = String(c.id);
          function handleClick() { onToggleCycle(cycleId); }
          return (
            <OptionRow
              key={c.id}
              active={selectedCycles.includes(cycleId)}
              label={c.name}
              onClick={handleClick}
            />
          );
        })}
        {cycles.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No cycles</p>
        )}
      </div>
    );
  }

  if (category === "sprint") {
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[160px] flex-col py-1 outline-none"
      >
        {sprints.map((s) => {
          const sprintId = String(s.id);
          function handleClick() { onToggleSprint(sprintId); }
          return (
            <OptionRow
              key={s.id}
              active={sprintParam === sprintId}
              label={s.name}
              onClick={handleClick}
            />
          );
        })}
        {sprints.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No sprints</p>
        )}
      </div>
    );
  }

  if (category === "project") {
    const projects = projectOptions ?? [];
    const filtered = projects.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
    );
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex min-w-[200px] flex-col outline-none"
      >
        {needsSearch && (
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
        )}
        <div className="max-h-[200px] overflow-y-auto py-1">
          {filtered.map((p) => {
            const projectId = String(p.id);
            function handleClick() { onToggleProject(projectId); }
            return (
              <OptionRow
                key={p.id}
                active={selectedProjectIds.includes(projectId)}
                label={p.name}
                onClick={handleClick}
              />
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No projects</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

interface FilterDatesInlineProps {
  dueDateFrom: string;
  dueDateTo: string;
  onDueDateFromChange: (v: string) => void;
  onDueDateToChange: (v: string) => void;
}

export function FilterDatesInline({
  dueDateFrom,
  dueDateTo,
  onDueDateFromChange,
  onDueDateToChange,
}: FilterDatesInlineProps) {
  const hasDate = Boolean(dueDateFrom || dueDateTo);
  return (
    <div className="px-2 pb-2 pt-0.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <CalendarRange className="h-3 w-3" />
        {hasDate ? (
          <span className="font-medium text-foreground">Range active</span>
        ) : (
          <span>Select a date range</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          value={dueDateFrom}
          onChange={onDueDateFromChange}
          placeholder="From"
          className="w-full text-xs"
        />
        <DatePicker
          value={dueDateTo}
          onChange={onDueDateToChange}
          placeholder="To"
          className="w-full text-xs"
        />
      </div>
    </div>
  );
}
