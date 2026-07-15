"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { Check, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import {
  StatusFilterDot,
  type StatusFilterOption,
} from "./filter-category-submenu";
import {
  FilterAssigneeLeading,
  FilterLabelDot,
  FilterPriorityLeading,
  FilterTypeLeading,
} from "./filter-option-leading";
import type { StatusConfigEntry } from "@/features/projects/shared/types";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;

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

interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

interface FilterFlatSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusItems: StatusFilterOption[];
  statusConfig: Record<string, StatusConfigEntry>;
  members: Member[];
  labels: Label[];
  cycles: Cycle[];
  sprints: Sprint[];
  projectOptions?: ProjectOption[];
  showTypeFilter: boolean;
  showSprintFilter: boolean;
  showAssigneeFilter: boolean;
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
}

function CheckMark({ active }: { active: boolean }) {
  return (
    <Check
      className={cn(
        "mr-2 h-3.5 w-3.5 shrink-0 transition-opacity motion-reduce:transition-none",
        active ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

export function FilterFlatSearch({
  search,
  onSearchChange,
  statusItems,
  statusConfig,
  members,
  labels,
  cycles,
  sprints,
  projectOptions,
  showTypeFilter,
  showSprintFilter,
  showAssigneeFilter,
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
}: FilterFlatSearchProps) {
  const hasDateFilter = Boolean(dueDateFrom || dueDateTo);
  const q = search.toLowerCase();

  const showDates =
    "dates".includes(q) ||
    "due date".includes(q) ||
    q.includes("date");

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Filter by..."
        className="h-9 text-xs"
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList className="max-h-[min(360px,var(--radix-popover-content-available-height))]">
        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
          No matching filters.
        </CommandEmpty>

        <CommandGroup heading="Status">
          {statusItems
            .filter((s) =>
              s.name.toLowerCase().includes(q) ||
              s.name.replace(/_/g, " ").toLowerCase().includes(q) ||
              "status".includes(q),
            )
            .map((s) => {
              const label = s.name.replace(/_/g, " ");
              const active = selectedStatuses.includes(s.name);
              function onSelectStatus() { onToggleStatus(s.name); }
              return (
                <CommandItem
                  key={s.name}
                  value={`Status ${label}`}
                  keywords={["status", label, s.name]}
                  onSelect={onSelectStatus}
                >
                  <CheckMark active={active} />
                  <StatusFilterDot status={s} config={statusConfig} className="mr-1.5 h-2 w-2 shrink-0 rounded-full" />
                  <span className="text-xs">{label}</span>
                </CommandItem>
              );
            })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Priority">
          {(PRIORITIES as readonly string[])
            .filter((p) => {
              const label = p.charAt(0) + p.slice(1).toLowerCase();
              return p.toLowerCase().includes(q) || label.toLowerCase().includes(q) || "priority".includes(q);
            })
            .map((p) => {
              const label = p.charAt(0) + p.slice(1).toLowerCase();
              const active = selectedPriorities.includes(p);
              function onSelectPriority() { onTogglePriority(p); }
              return (
                <CommandItem
                  key={p}
                  value={`Priority ${label}`}
                  keywords={["priority", label, p]}
                  onSelect={onSelectPriority}
                >
                  <CheckMark active={active} />
                  <FilterPriorityLeading priority={p} />
                  <span className="text-xs">{label}</span>
                </CommandItem>
              );
            })}
        </CommandGroup>

        {showTypeFilter && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Type">
              {(TYPES as readonly string[])
                .filter((t) => {
                  const label = t.charAt(0) + t.slice(1).toLowerCase();
                  return t.toLowerCase().includes(q) || label.toLowerCase().includes(q) || "type".includes(q);
                })
                .map((t) => {
                  const label = t.charAt(0) + t.slice(1).toLowerCase();
                  const active = selectedTypes.includes(t);
                  function onSelectType() { onToggleType(t); }
                  return (
                    <CommandItem
                      key={t}
                      value={`Type ${label}`}
                      keywords={["type", label, t]}
                      onSelect={onSelectType}
                    >
                      <CheckMark active={active} />
                      <FilterTypeLeading type={t} />
                      <span className="text-xs">{label}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        )}

        {showAssigneeFilter && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Assignee">
              {[
                { id: "@me", displayName: "Me (dynamic)", member: null as Member | null },
                { id: "__unassigned__", displayName: "Unassigned", member: null as Member | null },
                ...members.map((m) => ({ id: m.id, displayName: getUserDisplayName(m), member: m })),
              ]
                .filter(({ displayName }) =>
                  displayName.toLowerCase().includes(q) || "assignee".includes(q),
                )
                .map(({ id, displayName, member }) => {
                  const active = selectedAssignees.includes(id);
                  function onSelectAssignee() { onToggleAssignee(id); }
                  return (
                    <CommandItem
                      key={id}
                      value={`Assignee ${displayName}`}
                      keywords={["assignee", displayName]}
                      onSelect={onSelectAssignee}
                    >
                      <CheckMark active={active} />
                      <FilterAssigneeLeading assigneeId={id} member={member} />
                      <span className="text-xs">{displayName}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        )}

        {labels.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Label">
              {labels
                .filter((l) => l.name.toLowerCase().includes(q) || "label".includes(q))
                .map((l) => {
                  const labelId = String(l.id);
                  const active = selectedLabels.includes(labelId);
                  function onSelectLabel() { onToggleLabel(labelId); }
                  return (
                    <CommandItem
                      key={l.id}
                      value={`Label ${l.name}`}
                      keywords={["label", l.name]}
                      onSelect={onSelectLabel}
                    >
                      <CheckMark active={active} />
                      <FilterLabelDot color={l.color} />
                      <span className="text-xs">{l.name}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        )}

        {cycles.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Cycle">
              {cycles
                .filter((c) => c.name.toLowerCase().includes(q) || "cycle".includes(q))
                .map((c) => {
                  const cycleId = String(c.id);
                  const active = selectedCycles.includes(cycleId);
                  function onSelectCycle() { onToggleCycle(cycleId); }
                  return (
                    <CommandItem
                      key={c.id}
                      value={`Cycle ${c.name}`}
                      keywords={["cycle", c.name]}
                      onSelect={onSelectCycle}
                    >
                      <CheckMark active={active} />
                      <span className="text-xs">{c.name}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        )}

        {showSprintFilter && sprints.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sprint">
              {sprints
                .filter((s) => s.name.toLowerCase().includes(q) || "sprint".includes(q))
                .map((s) => {
                  const sprintId = String(s.id);
                  const active = sprintParam === sprintId;
                  function onSelectSprint() { onToggleSprint(sprintId); }
                  return (
                    <CommandItem
                      key={s.id}
                      value={`Sprint ${s.name}`}
                      keywords={["sprint", s.name]}
                      onSelect={onSelectSprint}
                    >
                      <CheckMark active={active} />
                      <span className="text-xs">{s.name}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        )}

        {(projectOptions?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Project">
              {(projectOptions ?? [])
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.key.toLowerCase().includes(q) ||
                    "project".includes(q),
                )
                .map((p) => {
                  const projectId = String(p.id);
                  const active = selectedProjectIds.includes(projectId);
                  function onSelectProject() { onToggleProject(projectId); }
                  return (
                    <CommandItem
                      key={p.id}
                      value={`Project ${p.name}`}
                      keywords={["project", p.name, p.key]}
                      onSelect={onSelectProject}
                    >
                      <CheckMark active={active} />
                      <span className="mr-1 font-mono text-[10px] text-muted-foreground">{p.key}</span>
                      <span className="text-xs">{p.name}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        )}

        {showDates && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Due Date">
              <div className="px-2 py-2">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <CalendarRange className="h-3 w-3" />
                  {hasDateFilter ? (
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
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}
