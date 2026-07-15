"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  ListFilter,
  ChevronRight,
  CircleDot,
  AlertTriangle,
  Layers,
  User,
  Zap,
  RefreshCw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterAssigneeLeading,
  FilterPriorityLeading,
  FilterTypeLeading,
} from "@/features/projects/shared/filter-option-leading";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { resolveColumnColor } from "@/features/projects/shared/column-colors";
import type { FilterState } from "./workload-types";

interface WorkloadMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image?: string | null;
}

interface StatusOption {
  name: string;
  color: string | null;
  type?: string | null;
}

interface SprintOption {
  id: number;
  name: string;
}

interface CycleOption {
  id: number;
  name: string;
}

export interface WorkloadFilterMenuProps {
  filters: FilterState;
  members: WorkloadMember[];
  sprints: SprintOption[];
  cycles: CycleOption[];
  projectStatuses?: StatusOption[];
  activeFilterCount: number;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

type WorkloadFilterCategory =
  | "sprint"
  | "cycle"
  | "priority"
  | "type"
  | "status"
  | "assignee";

const TICKET_TYPES = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"] as const;
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

function formatEnumLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

interface CategoryRowProps {
  icon: React.ReactNode;
  label: string;
  activeCount: number;
  hovered: boolean;
  onMouseEnter: () => void;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function CategoryRow({
  icon,
  label,
  activeCount,
  hovered,
  onMouseEnter,
  onFocus,
  onKeyDown,
}: CategoryRowProps) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={hovered}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={cn(
        "flex cursor-default select-none items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs outline-none transition-colors motion-reduce:transition-none",
        hovered
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {activeCount > 0 ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      ) : null}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </div>
  );
}

interface OptionRowProps {
  active: boolean;
  label: string;
  leading?: React.ReactNode;
  color?: string | null;
  onClick: () => void;
}

function OptionRow({ active, label, leading, color, onClick }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none motion-reduce:transition-none"
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
      ) : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function WorkloadFilterMenu({
  filters,
  members,
  sprints,
  cycles,
  projectStatuses,
  activeFilterCount,
  onFilterChange,
}: WorkloadFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<WorkloadFilterCategory | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const items: Array<{
      key: WorkloadFilterCategory;
      label: string;
      icon: React.ReactNode;
      visible: boolean;
      activeCount: number;
    }> = [
      {
        key: "sprint",
        label: "Sprint",
        icon: <Zap className="h-3.5 w-3.5" />,
        visible: sprints.length > 0,
        activeCount: filters.sprintId !== "all" ? 1 : 0,
      },
      {
        key: "cycle",
        label: "Cycle",
        icon: <RefreshCw className="h-3.5 w-3.5" />,
        visible: cycles.length > 0,
        activeCount: filters.cycleId !== "all" ? 1 : 0,
      },
      {
        key: "priority",
        label: "Priority",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        visible: true,
        activeCount: filters.priority !== "all" ? 1 : 0,
      },
      {
        key: "type",
        label: "Type",
        icon: <Layers className="h-3.5 w-3.5" />,
        visible: true,
        activeCount: filters.type !== "all" ? 1 : 0,
      },
      {
        key: "status",
        label: "Status",
        icon: <CircleDot className="h-3.5 w-3.5" />,
        visible: Boolean(projectStatuses && projectStatuses.length > 0),
        activeCount: filters.status !== "all" ? 1 : 0,
      },
      {
        key: "assignee",
        label: "Assignee",
        icon: <User className="h-3.5 w-3.5" />,
        visible: true,
        activeCount: filters.assigneeId !== "all" ? 1 : 0,
      },
    ];
    return items.filter((c) => c.visible);
  }, [sprints.length, cycles.length, projectStatuses, filters]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setHoveredCategory(null);
  }, []);

  const handleInteractOutside = useCallback(() => {
    setOpen(false);
  }, []);

  const handleMenuMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setHoveredCategory(null);
  }, []);

  const handleSubmenuClose = useCallback(() => {
    setHoveredCategory(null);
    categoryListRef.current?.focus();
  }, []);

  const handleCategoryMouseEnter = useCallback((key: WorkloadFilterCategory) => {
    setHoveredCategory(key);
  }, []);

  const handleCategoryFocus = useCallback((key: WorkloadFilterCategory) => {
    setHoveredCategory(key);
  }, []);

  const handleCategoryKeyDown = useCallback(
    (key: WorkloadFilterCategory, e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setHoveredCategory(key);
        setTimeout(() => {
          submenuRef.current?.focus();
        }, 0);
      }
    },
    [],
  );

  type StringFilterKey =
    | "sprintId"
    | "cycleId"
    | "priority"
    | "type"
    | "status"
    | "assigneeId";

  const selectSingle = useCallback(
    (key: StringFilterKey, current: string, value: string) => {
      onFilterChange(key, current === value ? "all" : value);
    },
    [onFilterChange],
  );

  const handleSelectSprint = useCallback(
    (value: string) => {
      selectSingle("sprintId", filters.sprintId, value);
    },
    [selectSingle, filters.sprintId],
  );

  const handleSelectCycle = useCallback(
    (value: string) => {
      selectSingle("cycleId", filters.cycleId, value);
    },
    [selectSingle, filters.cycleId],
  );

  const handleSelectPriority = useCallback(
    (value: string) => {
      selectSingle("priority", filters.priority, value);
    },
    [selectSingle, filters.priority],
  );

  const handleSelectType = useCallback(
    (value: string) => {
      selectSingle("type", filters.type, value);
    },
    [selectSingle, filters.type],
  );

  const handleSelectStatus = useCallback(
    (value: string) => {
      selectSingle("status", filters.status, value);
    },
    [selectSingle, filters.status],
  );

  const handleSelectAssignee = useCallback(
    (value: string) => {
      selectSingle("assigneeId", filters.assigneeId, value);
    },
    [selectSingle, filters.assigneeId],
  );

  const handleSubmenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        handleSubmenuClose();
      }
    },
    [handleSubmenuClose],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative shrink-0 gap-1.5 bg-card px-2.5 text-xs font-normal shadow-xs data-[state=open]:border-primary data-[state=open]:focus-visible:border-primary"
        >
          <ListFilter className="h-3.5 w-3.5 shrink-0" />
          <span>Add filter</span>
          {activeFilterCount > 0 ? (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto max-w-[min(520px,var(--radix-popover-content-available-width))] overflow-hidden p-0"
        onInteractOutside={handleInteractOutside}
      >
        <div
          className="flex max-h-[min(480px,var(--radix-popover-content-available-height))]"
          onMouseLeave={handleMenuMouseLeave}
        >
          <div className="flex w-fit min-w-[148px] shrink-0 flex-col">
            <div
              ref={categoryListRef}
              role="menu"
              aria-label="Workload filter categories"
              tabIndex={-1}
              className="overflow-y-auto px-0.5 py-0.5 outline-none"
            >
              {categories.map((cat) => {
                const isHovered = hoveredCategory === cat.key;
                function onMouseEnter() {
                  handleCategoryMouseEnter(cat.key);
                }
                function onFocus() {
                  handleCategoryFocus(cat.key);
                }
                function onKeyDown(e: React.KeyboardEvent) {
                  handleCategoryKeyDown(cat.key, e);
                }
                return (
                  <CategoryRow
                    key={cat.key}
                    icon={cat.icon}
                    label={cat.label}
                    activeCount={cat.activeCount}
                    hovered={isHovered}
                    onMouseEnter={onMouseEnter}
                    onFocus={onFocus}
                    onKeyDown={onKeyDown}
                  />
                );
              })}
            </div>
          </div>

          {hoveredCategory !== null ? (
            <div
              ref={submenuRef}
              tabIndex={-1}
              onKeyDown={handleSubmenuKeyDown}
              className="max-h-[280px] max-w-[220px] overflow-y-auto border-l border-border bg-popover py-1 outline-none"
            >
              {hoveredCategory === "sprint"
                ? sprints.map((s) => {
                    const id = String(s.id);
                    function handleClick() {
                      handleSelectSprint(id);
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
                      handleSelectCycle(id);
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
                      handleSelectPriority(p);
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
                      handleSelectType(t);
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
                      handleSelectStatus(s.name);
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
                      handleSelectAssignee(m.id);
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
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
