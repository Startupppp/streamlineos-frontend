"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Button } from "@/components/ui/button";
import {
  ListFilter,
  CircleDot,
  AlertTriangle,
  Layers,
  User,
  RefreshCw,
} from "lucide-react";

import {
  type WorkloadFilterMenuProps,
  type WorkloadFilterCategory,
  type StringFilterKey,
} from "./workload-filter-types";
import { CategoryRow } from "./workload-filter-rows";
import { WorkloadSubmenu } from "./workload-filter-submenu";

export type { WorkloadFilterMenuProps };

export function WorkloadFilterMenu({
  filters,
  members,
  cycles,
  projectStatuses,
  activeFilterCount,
  onFilterChange,
}: WorkloadFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] =
    useState<WorkloadFilterCategory | null>(null);
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
  }, [cycles.length, projectStatuses, filters]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setHoveredCategory(null);
  }, []);

  const handleInteractOutside = useCallback(() => {
    setOpen(false);
  }, []);

  const handleMenuMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const next = e.relatedTarget;
      if (next instanceof Node && e.currentTarget.contains(next)) return;
      setHoveredCategory(null);
    },
    [],
  );

  const handleSubmenuClose = useCallback(() => {
    setHoveredCategory(null);
    categoryListRef.current?.focus();
  }, []);

  const handleCategoryMouseEnter = useCallback(
    (key: WorkloadFilterCategory) => {
      setHoveredCategory(key);
    },
    [],
  );

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

  const selectSingle = useCallback(
    (key: StringFilterKey, current: string, value: string) => {
      onFilterChange(key, current === value ? "all" : value);
    },
    [onFilterChange],
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
    <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative shrink-0 gap-1.5 bg-card px-2.5 text-xs font-normal shadow-xs data-[state=open]:border-primary data-[state=open]:focus-visible:border-primary"
        >
          <ListFilter className="h-3.5 w-3.5 shrink-0" />
          <span>Add filter</span>
          {activeFilterCount > 0 ? (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        title="Add filter"
        className="w-auto max-w-[min(520px,var(--radix-popover-content-available-width))] overflow-hidden p-0"
        onInteractOutside={handleInteractOutside}
      >
        <div
          className="flex max-h-[min(480px,var(--radix-popover-content-available-height))]"
          onMouseLeave={handleMenuMouseLeave}
        >
          <div className="flex w-[200px] shrink-0 flex-col">
            <div
              ref={categoryListRef}
              role="menu"
              aria-label="Workload filter categories"
              tabIndex={-1}
              className="overflow-y-auto scrollbar-hide p-1 outline-none"
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
              className="max-h-[280px] w-[240px] overflow-y-auto scrollbar-hide border-l border-border bg-muted/20 p-1 outline-none"
            >
              <WorkloadSubmenu
                hoveredCategory={hoveredCategory}
                cycles={cycles}
                projectStatuses={projectStatuses}
                members={members}
                filters={filters}
                onSelectCycle={handleSelectCycle}
                onSelectPriority={handleSelectPriority}
                onSelectType={handleSelectType}
                onSelectStatus={handleSelectStatus}
                onSelectAssignee={handleSelectAssignee}
              />
            </div>
          ) : null}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
