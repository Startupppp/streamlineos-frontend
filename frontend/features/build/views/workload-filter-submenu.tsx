"use client";

import {
  FilterAssigneeLeading,
  FilterPriorityLeading,
  FilterTypeLeading,
} from "@/features/build/shared/filter-option-leading";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { resolveColumnColor } from "@/features/build/shared/column-colors";
import type { FilterState } from "./workload-types";
import {
  type WorkloadFilterCategory,
  type WorkloadMember,
  type StatusOption,
  type SprintOption,
  type CycleOption,
  TICKET_TYPES,
  PRIORITIES,
  formatEnumLabel,
} from "./workload-filter-types";
import { OptionRow } from "./workload-filter-rows";

interface WorkloadSubmenuProps {
  hoveredCategory: WorkloadFilterCategory;
  sprints: SprintOption[];
  cycles: CycleOption[];
  projectStatuses: StatusOption[] | undefined;
  members: WorkloadMember[];
  filters: FilterState;
  onSelectSprint: (value: string) => void;
  onSelectCycle: (value: string) => void;
  onSelectPriority: (value: string) => void;
  onSelectType: (value: string) => void;
  onSelectStatus: (value: string) => void;
  onSelectAssignee: (value: string) => void;
}

export function WorkloadSubmenu({
  hoveredCategory,
  sprints,
  cycles,
  projectStatuses,
  members,
  filters,
  onSelectSprint,
  onSelectCycle,
  onSelectPriority,
  onSelectType,
  onSelectStatus,
  onSelectAssignee,
}: WorkloadSubmenuProps) {
  return (
    <>
      {hoveredCategory === "sprint"
        ? sprints.map((s) => {
            const id = String(s.id);
            function handleClick() {
              onSelectSprint(id);
            }
            return (
              <OptionRow
                key={s.id}
                active={filters.sprintId === id}
                label={s.name}
                onClick={handleClick}
              />
            );
          })
        : null}
      {hoveredCategory === "cycle"
        ? cycles.map((c) => {
            const id = String(c.id);
            function handleClick() {
              onSelectCycle(id);
            }
            return (
              <OptionRow
                key={c.id}
                active={filters.cycleId === id}
                label={c.name}
                onClick={handleClick}
              />
            );
          })
        : null}
      {hoveredCategory === "priority"
        ? PRIORITIES.map((p) => {
            function handleClick() {
              onSelectPriority(p);
            }
            return (
              <OptionRow
                key={p}
                active={filters.priority === p}
                label={formatEnumLabel(p)}
                leading={<FilterPriorityLeading priority={p} />}
                onClick={handleClick}
              />
            );
          })
        : null}
      {hoveredCategory === "type"
        ? TICKET_TYPES.map((t) => {
            function handleClick() {
              onSelectType(t);
            }
            return (
              <OptionRow
                key={t}
                active={filters.type === t}
                label={formatEnumLabel(t)}
                leading={<FilterTypeLeading type={t} />}
                onClick={handleClick}
              />
            );
          })
        : null}
      {hoveredCategory === "status" && projectStatuses
        ? projectStatuses.map((s) => {
            function handleClick() {
              onSelectStatus(s.name);
            }
            return (
              <OptionRow
                key={s.name}
                active={filters.status === s.name}
                label={s.name.replace(/_/g, " ")}
                color={s.color ? resolveColumnColor(s.color) : null}
                onClick={handleClick}
              />
            );
          })
        : null}
      {hoveredCategory === "assignee"
        ? members.map((m) => {
            function handleClick() {
              onSelectAssignee(m.id);
            }
            return (
              <OptionRow
                key={m.id}
                active={filters.assigneeId === m.id}
                label={getUserDisplayName(m)}
                leading={<FilterAssigneeLeading assigneeId={m.id} member={m} />}
                onClick={handleClick}
              />
            );
          })
        : null}
    </>
  );
}
