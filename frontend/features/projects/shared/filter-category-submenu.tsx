"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
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
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;

const CATEGORY_TITLES: Record<FilterCategory, string> = {
  status: "Status",
  priority: "Priority",
  type: "Type",
  assignee: "Assignee",
  label: "Label",
  cycle: "Cycle",
  sprint: "Sprint",
  dates: "Due Dates",
  project: "Project",
};

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
  leading?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-sm",
        "transition-colors motion-reduce:transition-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:bg-accent",
      )}
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0 transition-opacity motion-reduce:transition-none",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      {leading}
      {!leading && color ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : !leading && dotClassName ? (
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassName)} />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export function StatusFilterDot({
  status,
  config,
  className = "h-2.5 w-2.5 shrink-0 rounded-full",
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

function FilterMenuSearch({
  value,
  onValueChange,
  placeholder,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
}) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onValueChange(e.target.value);
  }

  return (
    <div className="flex h-10 items-center gap-2 border-b border-border px-3">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function PanelShell({
  category,
  children,
  onKeyDown,
  containerRef,
  withSearch = false,
}: {
  category: FilterCategory;
  children: ReactNode;
  onKeyDown: (e: KeyboardEvent) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  withSearch?: boolean;
}) {
  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="flex w-[240px] flex-col outline-none"
    >
      {!withSearch ? (
        <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
          <span className="text-sm font-medium text-foreground">
            {CATEGORY_TITLES[category]}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="px-3 py-6 text-center text-sm text-muted-foreground">{message}</p>
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
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown}>
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
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown}>
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown}>
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown}>
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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
      >
        {needsSearch ? (
          <FilterMenuSearch
            value={search}
            onValueChange={setSearch}
            placeholder="Search assignees…"
          />
        ) : null}
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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
      >
        {needsSearch ? (
          <FilterMenuSearch
            value={search}
            onValueChange={setSearch}
            placeholder="Search labels…"
          />
        ) : null}
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown}>
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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
      <PanelShell category={category} containerRef={containerRef} onKeyDown={handleKeyDown}>
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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
      >
        {needsSearch ? (
          <FilterMenuSearch
            value={search}
            onValueChange={setSearch}
            placeholder="Search projects…"
          />
        ) : null}
        <div className="max-h-[280px] overflow-y-auto scrollbar-hide p-1">
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

interface FilterDatesPanelProps {
  dueDateFrom: string;
  dueDateTo: string;
  onDueDateFromChange: (v: string) => void;
  onDueDateToChange: (v: string) => void;
}

export function FilterDatesPanel({
  dueDateFrom,
  dueDateTo,
  onDueDateFromChange,
  onDueDateToChange,
}: FilterDatesPanelProps) {
  const hasDate = Boolean(dueDateFrom || dueDateTo);
  return (
    <div className="px-3 py-3">
      <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
        {hasDate ? (
          <span className="font-medium text-foreground">Range active</span>
        ) : (
          <span>Select a date range</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        <DatePicker
          value={dueDateFrom}
          onChange={onDueDateFromChange}
          placeholder="From"
          className="w-full text-sm"
        />
        <DatePicker
          value={dueDateTo}
          onChange={onDueDateToChange}
          placeholder="To"
          className="w-full text-sm"
        />
      </div>
    </div>
  );
}
