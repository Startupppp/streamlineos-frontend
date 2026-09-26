"use client";

import {
  FilterAssigneeLeading,
  FilterPriorityLeading,
  FilterTypeLeading,
} from "@/features/build/shared/filter-option-leading";
import { getUserDisplayName } from "@/lib/person-display";
import { resolveColumnColor } from "@/lib/column-colors";
import type { FilterState } from "./workload-types";
import {
  type WorkloadFilterCategory,
  type WorkloadMember,
  type StatusOption,
  type CycleOption,
  type TeamOption,
  TICKET_TYPES,
  PRIORITIES,
  formatEnumLabel,
} from "./workload-filter-types";
import { OptionRow } from "./workload-filter-rows";

interface WorkloadSubmenuProps {
  hoveredCategory: WorkloadFilterCategory;
  cycles: CycleOption[];
  projectStatuses: StatusOption[] | undefined;
  members: WorkloadMember[];
  teams: TeamOption[];
  filters: FilterState;
  onSelectCycle: (value: string) => void;
  onSelectPriority: (value: string) => void;
  onSelectType: (value: string) => void;
  onSelectStatus: (value: string) => void;
  onSelectAssignee: (value: string) => void;
  onSelectTeam: (value: string) => void;
}

export function WorkloadSubmenu({
  hoveredCategory,
  cycles,
  projectStatuses,
  members,
  teams,
  filters,
  onSelectCycle,
  onSelectPriority,
  onSelectType,
  onSelectStatus,
  onSelectAssignee,
  onSelectTeam,
}: WorkloadSubmenuProps) {
  return (
    <>
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
      {hoveredCategory === "team"
        ? teams.map((t) => {
            const id = String(t.id);
            function handleClick() {
              onSelectTeam(id);
            }
            return (
              <OptionRow
                key={t.id}
                active={filters.teamId === id}
                label={t.name}
                onClick={handleClick}
              />
            );
          })
        : null}
    </>
  );
}
