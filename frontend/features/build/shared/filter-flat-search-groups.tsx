"use client";

import dynamic from "next/dynamic";
import {
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Check, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/person-display";
import { StatusFilterDot, type StatusFilterOption } from "./filter-category-submenu";
import {
  FilterAssigneeLeading,
  FilterLabelDot,
} from "./filter-option-leading";
import type { StatusConfigEntry } from "@/lib/status-config";

const DatePicker = dynamic(
  () => import("@/components/ui/date-picker").then((m) => ({ default: m.DatePicker })),
  { ssr: false, loading: () => null },
);

export interface Member {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
  email?: string | null;
}

export interface Label {
  id: number;
  name: string;
  color?: string | null;
}

export interface Cycle {
  id: number;
  name: string;
}

export interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

export function CheckMark({ active }: { active: boolean }) {
  return (
    <Check
      className={cn(
        "mr-2 h-4 w-4 shrink-0 transition-opacity motion-reduce:transition-none",
        active ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

interface StatusGroupProps {
  q: string;
  statusItems: StatusFilterOption[];
  statusConfig: Record<string, StatusConfigEntry>;
  selectedStatuses: string[];
  onToggleStatus: (v: string) => void;
}

export function StatusGroup({ q, statusItems, statusConfig, selectedStatuses, onToggleStatus }: StatusGroupProps) {
  return (
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
              <StatusFilterDot status={s} config={statusConfig} className="mr-1.5 h-2.5 w-2.5 shrink-0 rounded-full" />
              <span className="text-sm">{label}</span>
            </CommandItem>
          );
        })}
    </CommandGroup>
  );
}

interface AssigneeGroupProps {
  q: string;
  members: Member[];
  selectedAssignees: string[];
  onToggleAssignee: (v: string) => void;
}

export function AssigneeGroup({ q, members, selectedAssignees, onToggleAssignee }: AssigneeGroupProps) {
  const assigneeOptions: { id: string; displayName: string; member: Member | null }[] = [
    { id: "@me", displayName: "Me (dynamic)", member: null },
    { id: "__unassigned__", displayName: "Unassigned", member: null },
    ...members.map((m) => ({ id: m.id, displayName: getUserDisplayName(m), member: m })),
  ];
  return (
    <CommandGroup heading="Assignee">
      {assigneeOptions
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
              <span className="text-sm">{displayName}</span>
            </CommandItem>
          );
        })}
    </CommandGroup>
  );
}

interface LabelGroupProps {
  q: string;
  labels: Label[];
  selectedLabels: string[];
  onToggleLabel: (v: string) => void;
}

export function LabelGroup({ q, labels, selectedLabels, onToggleLabel }: LabelGroupProps) {
  return (
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
              <span className="text-sm">{l.name}</span>
            </CommandItem>
          );
        })}
    </CommandGroup>
  );
}

interface CycleGroupProps {
  q: string;
  cycles: Cycle[];
  selectedCycles: string[];
  onToggleCycle: (v: string) => void;
}

export function CycleGroup({ q, cycles, selectedCycles, onToggleCycle }: CycleGroupProps) {
  return (
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
              <span className="text-sm">{c.name}</span>
            </CommandItem>
          );
        })}
    </CommandGroup>
  );
}

interface ProjectGroupProps {
  q: string;
  projectOptions: ProjectOption[];
  selectedProjectIds: string[];
  onToggleProject: (v: string) => void;
}

export function ProjectGroup({ q, projectOptions, selectedProjectIds, onToggleProject }: ProjectGroupProps) {
  return (
    <CommandGroup heading="Project">
      {projectOptions
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
              <span className="mr-1.5 font-mono text-xs text-muted-foreground">{p.key}</span>
              <span className="text-sm">{p.name}</span>
            </CommandItem>
          );
        })}
    </CommandGroup>
  );
}

interface DueDateGroupProps {
  dueDateFrom: string;
  dueDateTo: string;
  onDueDateFromChange: (v: string) => void;
  onDueDateToChange: (v: string) => void;
  hasDateFilter: boolean;
}

export function DueDateGroup({ dueDateFrom, dueDateTo, onDueDateFromChange, onDueDateToChange, hasDateFilter }: DueDateGroupProps) {
  return (
    <CommandGroup heading="Due Date">
      <div className="px-3 py-3">
        <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" />
          {hasDateFilter ? (
            <span className="font-medium text-foreground">Range active</span>
          ) : (
            <span>Select a date range</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
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
    </CommandGroup>
  );
}
