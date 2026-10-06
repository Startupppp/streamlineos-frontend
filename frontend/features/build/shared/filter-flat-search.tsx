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
import { cn } from "@/lib/utils";
import {
  FilterPriorityLeading,
  FilterTypeLeading,
} from "./filter-option-leading";
import type { StatusFilterOption } from "./filter-category-submenu";
import type { StatusConfigEntry } from "@/lib/status-config";
import {
  CheckMark,
  StatusGroup,
  AssigneeGroup,
  LabelGroup,
  CycleGroup,
  ProjectGroup,
  DueDateGroup,
  type Member,
  type Label,
  type Cycle,
  type ProjectOption,
} from "./filter-flat-search-groups";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;

interface FilterFlatSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusItems: StatusFilterOption[];
  statusConfig: Record<string, StatusConfigEntry>;
  members: Member[];
  labels: Label[];
  cycles: Cycle[];
  projectOptions?: ProjectOption[];
  showTypeFilter: boolean;
  showAssigneeFilter: boolean;
  selectedStatuses: string[];
  selectedPriorities: string[];
  selectedTypes: string[];
  selectedAssignees: string[];
  selectedLabels: string[];
  selectedCycles: string[];
  selectedProjectIds: string[];
  dueDateFrom: string;
  dueDateTo: string;
  onToggleStatus: (v: string) => void;
  onTogglePriority: (v: string) => void;
  onToggleType: (v: string) => void;
  onToggleAssignee: (v: string) => void;
  onToggleLabel: (v: string) => void;
  onToggleCycle: (v: string) => void;
  onToggleProject: (v: string) => void;
  onDueDateFromChange: (v: string) => void;
  onDueDateToChange: (v: string) => void;
}

export function FilterFlatSearch({
  search,
  onSearchChange,
  statusItems,
  statusConfig,
  members,
  labels,
  cycles,
  projectOptions,
  showTypeFilter,
  showAssigneeFilter,
  selectedStatuses,
  selectedPriorities,
  selectedTypes,
  selectedAssignees,
  selectedLabels,
  selectedCycles,
  selectedProjectIds,
  dueDateFrom,
  dueDateTo,
  onToggleStatus,
  onTogglePriority,
  onToggleType,
  onToggleAssignee,
  onToggleLabel,
  onToggleCycle,
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
    <Command
      shouldFilter={false}
      className={cn(
        "[&_[cmdk-input-wrapper]]:h-10 [&_[cmdk-input-wrapper]]:px-3",
        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs",
        "[&_[cmdk-item]]:h-9 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:text-sm",
      )}
    >
      <CommandInput
        placeholder="Filter by…"
        className="h-10 text-sm"
        value={search}
        onValueChange={onSearchChange}
      />
      <CommandList className="max-h-[min(360px,var(--radix-popover-content-available-height))] scrollbar-hide">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          No matching filters.
        </CommandEmpty>

        <StatusGroup
          q={q}
          statusItems={statusItems}
          statusConfig={statusConfig}
          selectedStatuses={selectedStatuses}
          onToggleStatus={onToggleStatus}
        />

        <CommandSeparator />

        <CommandGroup heading="Priority">
          {PRIORITIES
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
                  <span className="text-sm">{label}</span>
                </CommandItem>
              );
            })}
        </CommandGroup>

        {showTypeFilter && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Type">
              {TYPES
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
                      <span className="text-sm">{label}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </>
        )}

        {showAssigneeFilter && (
          <>
            <CommandSeparator />
            <AssigneeGroup
              q={q}
              members={members}
              selectedAssignees={selectedAssignees}
              onToggleAssignee={onToggleAssignee}
            />
          </>
        )}

        {labels.length > 0 && (
          <>
            <CommandSeparator />
            <LabelGroup
              q={q}
              labels={labels}
              selectedLabels={selectedLabels}
              onToggleLabel={onToggleLabel}
            />
          </>
        )}

        {cycles.length > 0 && (
          <>
            <CommandSeparator />
            <CycleGroup
              q={q}
              cycles={cycles}
              selectedCycles={selectedCycles}
              onToggleCycle={onToggleCycle}
            />
          </>
        )}

        {(projectOptions?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <ProjectGroup
              q={q}
              projectOptions={projectOptions ?? []}
              selectedProjectIds={selectedProjectIds}
              onToggleProject={onToggleProject}
            />
          </>
        )}

        {showDates && (
          <>
            <CommandSeparator />
            <DueDateGroup
              dueDateFrom={dueDateFrom}
              dueDateTo={dueDateTo}
              onDueDateFromChange={onDueDateFromChange}
              onDueDateToChange={onDueDateToChange}
              hasDateFilter={hasDateFilter}
            />
          </>
        )}
      </CommandList>
    </Command>
  );
}
