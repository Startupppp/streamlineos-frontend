"use client";

import { useState, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  ListFilter,
  ChevronRight,
  CircleDot,
  AlertTriangle,
  Tag,
  User,
  Layers,
  RefreshCw,
  Zap,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterCategorySubmenu,
  type FilterCategory,
} from "./filter-category-submenu";
import { FilterFlatSearch } from "./filter-flat-search";

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

interface CategoryDefinition {
  key: FilterCategory;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
  activeCount: number;
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
        "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors motion-reduce:transition-none",
        hovered
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {activeCount > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
          {activeCount}
        </span>
      )}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </div>
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
  const [search, setSearch] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<FilterCategory | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);

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

  const isSearching = search.trim().length > 0;

  const categories: CategoryDefinition[] = [
    {
      key: "status",
      label: "Status",
      icon: <CircleDot className="h-3.5 w-3.5" />,
      visible: true,
      activeCount: selectedStatuses.length,
    },
    {
      key: "priority",
      label: "Priority",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      visible: true,
      activeCount: selectedPriorities.length,
    },
    {
      key: "type",
      label: "Type",
      icon: <Layers className="h-3.5 w-3.5" />,
      visible: showTypeFilter,
      activeCount: selectedTypes.length,
    },
    {
      key: "assignee",
      label: "Assignee",
      icon: <User className="h-3.5 w-3.5" />,
      visible: showAssigneeFilter,
      activeCount: selectedAssignees.length,
    },
    {
      key: "label",
      label: "Label",
      icon: <Tag className="h-3.5 w-3.5" />,
      visible: labels.length > 0,
      activeCount: selectedLabels.length,
    },
    {
      key: "cycle",
      label: "Cycle",
      icon: <RefreshCw className="h-3.5 w-3.5" />,
      visible: cycles.length > 0,
      activeCount: selectedCycles.length,
    },
    {
      key: "sprint",
      label: "Sprint",
      icon: <Zap className="h-3.5 w-3.5" />,
      visible: showSprintFilter && sprints.length > 0,
      activeCount: sprintParam ? 1 : 0,
    },
    {
      key: "dates",
      label: "Due Dates",
      icon: <CalendarRange className="h-3.5 w-3.5" />,
      visible: true,
      activeCount: dueDateFrom || dueDateTo ? 1 : 0,
    },
  ];

  const visibleCategories = categories.filter((c) => c.visible);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setHoveredCategory(null);
    }
  }

  function handleInteractOutside() {
    setOpen(false);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.trim().length > 0) {
      setHoveredCategory(null);
    }
  }

  function handleCategoryMouseEnter(key: FilterCategory) {
    setHoveredCategory(key);
  }

  function handleCategoryFocus(key: FilterCategory) {
    setHoveredCategory(key);
  }

  function handleCategoryKeyDown(key: FilterCategory, e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setHoveredCategory(key);
      setTimeout(() => {
        submenuRef.current?.focus();
      }, 0);
    }
  }

  function handleSubmenuClose() {
    setHoveredCategory(null);
    categoryListRef.current?.focus();
  }

  function handleListMouseLeave() {
    setHoveredCategory(null);
  }

  const handleToggleStatus = useCallback((v: string) => { onToggleStatus(v); }, [onToggleStatus]);
  const handleTogglePriority = useCallback((v: string) => { onTogglePriority(v); }, [onTogglePriority]);
  const handleToggleType = useCallback((v: string) => { onToggleType(v); }, [onToggleType]);
  const handleToggleAssignee = useCallback((v: string) => { onToggleAssignee(v); }, [onToggleAssignee]);
  const handleToggleLabel = useCallback((v: string) => { onToggleLabel(v); }, [onToggleLabel]);
  const handleToggleCycle = useCallback((v: string) => { onToggleCycle(v); }, [onToggleCycle]);
  const handleToggleSprint = useCallback((v: string) => { onToggleSprint(v); }, [onToggleSprint]);
  const handleDueDateFromChange = useCallback((v: string) => { onDueDateFromChange(v); }, [onDueDateFromChange]);
  const handleDueDateToChange = useCallback((v: string) => { onDueDateToChange(v); }, [onDueDateToChange]);

  const sharedProps = {
    statusOptions,
    members,
    labels,
    cycles,
    sprints,
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    sprintParam,
    dueDateFrom,
    dueDateTo,
    onToggleStatus: handleToggleStatus,
    onTogglePriority: handleTogglePriority,
    onToggleType: handleToggleType,
    onToggleAssignee: handleToggleAssignee,
    onToggleLabel: handleToggleLabel,
    onToggleCycle: handleToggleCycle,
    onToggleSprint: handleToggleSprint,
    onDueDateFromChange: handleDueDateFromChange,
    onDueDateToChange: handleDueDateToChange,
  };

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
        className="w-64 p-0 overflow-visible"
        onInteractOutside={handleInteractOutside}
      >
        {isSearching ? (
          <FilterFlatSearch
            search={search}
            onSearchChange={handleSearchChange}
            showTypeFilter={showTypeFilter}
            showSprintFilter={showSprintFilter}
            showAssigneeFilter={showAssigneeFilter}
            {...sharedProps}
          />
        ) : (
          <div className="flex">
            <div className="min-w-[200px]">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Filter by..."
                  className="h-9 text-xs"
                  value={search}
                  onValueChange={handleSearchChange}
                />
              </Command>
              <div
                ref={categoryListRef}
                role="menu"
                aria-label="Filter categories"
                onMouseLeave={handleListMouseLeave}
                className="p-1"
              >
                {visibleCategories.map((cat) => {
                  function onMouseEnter() { handleCategoryMouseEnter(cat.key); }
                  function onFocus() { handleCategoryFocus(cat.key); }
                  function onKeyDown(e: React.KeyboardEvent) { handleCategoryKeyDown(cat.key, e); }
                  return (
                    <CategoryRow
                      key={cat.key}
                      icon={cat.icon}
                      label={cat.label}
                      activeCount={cat.activeCount}
                      hovered={hoveredCategory === cat.key}
                      onMouseEnter={onMouseEnter}
                      onFocus={onFocus}
                      onKeyDown={onKeyDown}
                    />
                  );
                })}
              </div>
            </div>

            {hoveredCategory !== null && (
              <div
                ref={submenuRef}
                className="border-l border-border bg-popover"
              >
                <FilterCategorySubmenu
                  category={hoveredCategory}
                  onClose={handleSubmenuClose}
                  {...sharedProps}
                />
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
