"use client";

import { useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Check, ListFilter, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";

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

export interface FilterState {
  selectedStatuses: string[];
  selectedPriorities: string[];
  selectedTypes: string[];
  selectedAssignees: string[];
  selectedLabels: string[];
  selectedCycles: string[];
  sprintParam: string;
  dueDateFrom: string;
  dueDateTo: string;
}

export interface FilterCommandMenuProps {
  activeFilterCount: number;
  statusOptions: string[];
  members: Member[];
  labels: Label[];
  cycles: Cycle[];
  sprints: Sprint[];
  showTypeFilter: boolean;
  showSprintFilter: boolean;
  showAssigneeFilter: boolean;
  filterState: FilterState;
  onToggleStatus: (value: string) => void;
  onTogglePriority: (value: string) => void;
  onToggleType: (value: string) => void;
  onToggleAssignee: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onToggleCycle: (value: string) => void;
  onToggleSprint: (value: string) => void;
  onDueDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
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

export function FilterCommandMenu({
  activeFilterCount,
  statusOptions,
  members,
  labels,
  cycles,
  sprints,
  showTypeFilter,
  showSprintFilter,
  showAssigneeFilter,
  filterState,
  onToggleStatus,
  onTogglePriority,
  onToggleType,
  onToggleAssignee,
  onToggleLabel,
  onToggleCycle,
  onToggleSprint,
  onDueDateFromChange,
  onDueDateToChange,
}: FilterCommandMenuProps) {
  const [open, setOpen] = useState(false);

  const {
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    sprintParam,
    dueDateFrom,
    dueDateTo,
  } = filterState;

  const handleToggleStatus = useCallback(
    (value: string) => { onToggleStatus(value); },
    [onToggleStatus],
  );

  const handleTogglePriority = useCallback(
    (value: string) => { onTogglePriority(value); },
    [onTogglePriority],
  );

  const handleToggleType = useCallback(
    (value: string) => { onToggleType(value); },
    [onToggleType],
  );

  const handleToggleAssignee = useCallback(
    (value: string) => { onToggleAssignee(value); },
    [onToggleAssignee],
  );

  const handleToggleLabel = useCallback(
    (value: string) => { onToggleLabel(value); },
    [onToggleLabel],
  );

  const handleToggleCycle = useCallback(
    (value: string) => { onToggleCycle(value); },
    [onToggleCycle],
  );

  const handleToggleSprint = useCallback(
    (value: string) => { onToggleSprint(value); },
    [onToggleSprint],
  );

  const handleDueDateFromChange = useCallback(
    (value: string) => { onDueDateFromChange(value); },
    [onDueDateFromChange],
  );

  const handleDueDateToChange = useCallback(
    (value: string) => { onDueDateToChange(value); },
    [onDueDateToChange],
  );

  const hasDateFilter = Boolean(dueDateFrom || dueDateTo);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  function handleInteractOutside() {
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative h-8 shrink-0 gap-1.5 bg-card border-border px-2.5 text-xs font-normal shadow-xs"
        >
          <ListFilter className="h-3.5 w-3.5 shrink-0" />
          <span>Add filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
        onInteractOutside={handleInteractOutside}
      >
        <Command>
          <CommandInput placeholder="Search filters..." className="h-9 text-xs" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No matching filters.
            </CommandEmpty>

            <CommandGroup heading="Status">
              {statusOptions.map((s) => {
                const label = s.replace(/_/g, " ");
                const active = selectedStatuses.includes(s);
                function onSelectStatus() { handleToggleStatus(s); }
                return (
                  <CommandItem
                    key={s}
                    value={`Status ${label}`}
                    keywords={["status", label, s]}
                    onSelect={onSelectStatus}
                  >
                    <CheckMark active={active} />
                    <span className="text-xs">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Priority">
              {PRIORITIES.map((p) => {
                const label = p.charAt(0) + p.slice(1).toLowerCase();
                const active = selectedPriorities.includes(p);
                function onSelectPriority() { handleTogglePriority(p); }
                return (
                  <CommandItem
                    key={p}
                    value={`Priority ${label}`}
                    keywords={["priority", label, p]}
                    onSelect={onSelectPriority}
                  >
                    <CheckMark active={active} />
                    <span className="text-xs">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {showTypeFilter && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Type">
                  {TYPES.map((t) => {
                    const label = t.charAt(0) + t.slice(1).toLowerCase();
                    const active = selectedTypes.includes(t);
                    function onSelectType() { handleToggleType(t); }
                    return (
                      <CommandItem
                        key={t}
                        value={`Type ${label}`}
                        keywords={["type", label, t]}
                        onSelect={onSelectType}
                      >
                        <CheckMark active={active} />
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
                  <CommandItem
                    value="Assignee Unassigned"
                    keywords={["assignee", "unassigned", "no assignee"]}
                    onSelect={() => handleToggleAssignee("__unassigned__")}
                  >
                    <CheckMark active={selectedAssignees.includes("__unassigned__")} />
                    <span className="text-xs">Unassigned</span>
                  </CommandItem>
                  {members.map((m) => {
                    const displayName = getUserDisplayName(m);
                    const active = selectedAssignees.includes(m.id);
                    function onSelectAssignee() { handleToggleAssignee(m.id); }
                    return (
                      <CommandItem
                        key={m.id}
                        value={`Assignee ${displayName}`}
                        keywords={["assignee", displayName, m.email ?? ""]}
                        onSelect={onSelectAssignee}
                      >
                        <CheckMark active={active} />
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
                  {labels.map((l) => {
                    const labelId = String(l.id);
                    const active = selectedLabels.includes(labelId);
                    function onSelectLabel() { handleToggleLabel(labelId); }
                    return (
                      <CommandItem
                        key={l.id}
                        value={`Label ${l.name}`}
                        keywords={["label", l.name]}
                        onSelect={onSelectLabel}
                      >
                        <CheckMark active={active} />
                        {l.color && (
                          <span
                            className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: l.color }}
                          />
                        )}
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
                  {cycles.map((c) => {
                    const cycleId = String(c.id);
                    const active = selectedCycles.includes(cycleId);
                    function onSelectCycle() { handleToggleCycle(cycleId); }
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
                  {sprints.map((s) => {
                    const sprintId = String(s.id);
                    const active = sprintParam === sprintId;
                    function onSelectSprint() { handleToggleSprint(sprintId); }
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
                <div className="flex items-center gap-1.5">
                  <DatePicker
                    value={dueDateFrom}
                    onChange={handleDueDateFromChange}
                    placeholder="From"
                    className="h-7 flex-1 min-w-0 text-xs"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">-</span>
                  <DatePicker
                    value={dueDateTo}
                    onChange={handleDueDateToChange}
                    placeholder="To"
                    className="h-7 flex-1 min-w-0 text-xs"
                  />
                </div>
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
