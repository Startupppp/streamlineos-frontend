"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { resolveColumnColor } from "@/lib/column-colors";
import { getStatusEntry, type StatusConfigEntry } from "@/lib/status-config";
import {
  FilterPriorityLeading,
  FilterTypeLeading,
} from "./filter-option-leading";
import {
  OptionRow,
  PanelShell,
  EmptyHint,
  FilterDatesPanel,
  PRIORITIES,
  TYPES,
  type FilterCategory,
  type StatusFilterOption,
  type Member,
  type Label,
  type Cycle,
  type ProjectOption,
} from "@/components/list-view";
import {
  AssigneePanel,
  LabelPanel,
  ProjectPanel,
} from "./filter-category-list-panels";

export type { StatusFilterOption } from "@/components/list-view";
export { StatusFilterDot } from "@/components/list-view";

interface FilterCategorySubmenuProps {
  category: FilterCategory;
  statusItems: StatusFilterOption[];
  statusConfig: Record<string, StatusConfigEntry>;
  members: Member[];
  labels: Label[];
  cycles: Cycle[];
  projectOptions?: ProjectOption[];
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
  projectOptions,
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
  onClose,
  showTitle = true,
  className,
  listClassName = "max-h-[min(50dvh,320px)] overflow-y-auto scrollbar-hide p-1",
}: FilterCategorySubmenuProps) {
  const [search, setSearch] = useSourceOverride(category, "");
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
    return (
      <AssigneePanel
        members={members}
        selectedAssignees={selectedAssignees}
        onToggleAssignee={onToggleAssignee}
        search={search}
        onSearchChange={setSearch}
        q={q}
        containerRef={containerRef}
        onKeyDown={handleKeyDown}
        showTitle={showTitle}
        className={className}
        listClassName={listClassName}
      />
    );
  }

  if (category === "label") {
    return (
      <LabelPanel
        labels={labels}
        selectedLabels={selectedLabels}
        onToggleLabel={onToggleLabel}
        search={search}
        onSearchChange={setSearch}
        q={q}
        containerRef={containerRef}
        onKeyDown={handleKeyDown}
        showTitle={showTitle}
        className={className}
        listClassName={listClassName}
      />
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

  if (category === "project") {
    return (
      <ProjectPanel
        projectOptions={projectOptions ?? []}
        selectedProjectIds={selectedProjectIds}
        onToggleProject={onToggleProject}
        search={search}
        onSearchChange={setSearch}
        q={q}
        containerRef={containerRef}
        onKeyDown={handleKeyDown}
        showTitle={showTitle}
        className={className}
        listClassName={listClassName}
      />
    );
  }

  return null;
}
