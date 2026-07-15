"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterCategorySubmenu,
  FilterDatesInline,
  type FilterCategory,
  type StatusFilterOption,
} from "./filter-category-submenu";
import { FilterCategoryRow } from "./filter-category-row";
import { FilterFlatSearch } from "./filter-flat-search";
import { FilterAssigneeLeading } from "./filter-option-leading";
import type { StatusConfigEntry } from "@/features/projects/shared/types";
import {
  listContainer,
  listItem,
  listItemReduced,
  pmSnappy,
} from "@/features/projects/shared/pm-motion";

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
  selectedProjectIds: string[];
  sprintParam: string;
  dueDateFrom: string;
  dueDateTo: string;
}

interface ProjectOption {
  id: number;
  name: string;
  key: string;
}

export interface FilterCommandMenuProps {
  activeFilterCount: number;
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
  filterState: FilterState;
  onToggleStatus: (value: string) => void;
  onTogglePriority: (value: string) => void;
  onToggleType: (value: string) => void;
  onToggleAssignee: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onToggleCycle: (value: string) => void;
  onToggleSprint: (value: string) => void;
  onToggleProject: (value: string) => void;
  onDueDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
}

interface CategoryDefinition {
  key: FilterCategory;
  label: string;
  leading?: ReactNode;
  visible: boolean;
  activeCount: number;
}

export function FilterCommandMenu({
  activeFilterCount,
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
  filterState,
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
}: FilterCommandMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<FilterCategory | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const datesInlineRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const datesExpanded = hoveredCategory === "dates";

  useEffect(() => {
    if (datesExpanded) {
      datesInlineRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [datesExpanded]);

  const {
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
  } = filterState;

  const isSearching = search.trim().length > 0;

  function resolveAssigneeLeading(): ReactNode | undefined {
    if (selectedAssignees.length !== 1) return undefined;
    const id = selectedAssignees[0];
    if (!id) return undefined;
    if (id === "@me" || id === "__unassigned__") {
      return <FilterAssigneeLeading assigneeId={id} />;
    }
    const member = members.find((m) => m.id === id);
    if (!member) return undefined;
    return <FilterAssigneeLeading assigneeId={id} member={member} />;
  }

  const categories: CategoryDefinition[] = [
    {
      key: "status",
      label: "Status",
      visible: true,
      activeCount: selectedStatuses.length,
    },
    {
      key: "priority",
      label: "Priority",
      visible: true,
      activeCount: selectedPriorities.length,
    },
    {
      key: "type",
      label: "Type",
      visible: showTypeFilter,
      activeCount: selectedTypes.length,
    },
    {
      key: "assignee",
      label: "Assignee",
      leading: resolveAssigneeLeading(),
      visible: showAssigneeFilter,
      activeCount: selectedAssignees.length,
    },
    {
      key: "label",
      label: "Label",
      visible: labels.length > 0,
      activeCount: selectedLabels.length,
    },
    {
      key: "cycle",
      label: "Cycle",
      visible: cycles.length > 0,
      activeCount: selectedCycles.length,
    },
    {
      key: "sprint",
      label: "Sprint",
      visible: showSprintFilter && sprints.length > 0,
      activeCount: sprintParam ? 1 : 0,
    },
    {
      key: "dates",
      label: "Due Dates",
      visible: true,
      activeCount: dueDateFrom || dueDateTo ? 1 : 0,
    },
    {
      key: "project",
      label: "Project",
      visible: (projectOptions?.length ?? 0) > 0,
      activeCount: selectedProjectIds.length,
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

  function handleCategoryKeyDown(key: FilterCategory, e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setHoveredCategory(key);
      if (key !== "dates") {
        setTimeout(() => {
          submenuRef.current?.focus();
        }, 0);
      }
    }
  }

  function handleSubmenuClose() {
    setHoveredCategory(null);
    categoryListRef.current?.focus();
  }

  function handleMenuMouseLeave(e: MouseEvent<HTMLDivElement>) {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) {
      return;
    }
    setHoveredCategory(null);
  }

  const handleToggleStatus = useCallback((v: string) => { onToggleStatus(v); }, [onToggleStatus]);
  const handleTogglePriority = useCallback((v: string) => { onTogglePriority(v); }, [onTogglePriority]);
  const handleToggleType = useCallback((v: string) => { onToggleType(v); }, [onToggleType]);
  const handleToggleAssignee = useCallback((v: string) => { onToggleAssignee(v); }, [onToggleAssignee]);
  const handleToggleLabel = useCallback((v: string) => { onToggleLabel(v); }, [onToggleLabel]);
  const handleToggleCycle = useCallback((v: string) => { onToggleCycle(v); }, [onToggleCycle]);
  const handleToggleSprint = useCallback((v: string) => { onToggleSprint(v); }, [onToggleSprint]);
  const handleToggleProject = useCallback((v: string) => { onToggleProject(v); }, [onToggleProject]);
  const handleDueDateFromChange = useCallback((v: string) => { onDueDateFromChange(v); }, [onDueDateFromChange]);
  const handleDueDateToChange = useCallback((v: string) => { onDueDateToChange(v); }, [onDueDateToChange]);

  const sharedProps = {
    statusItems,
    statusConfig,
    members,
    labels,
    cycles,
    sprints,
    projectOptions,
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
    onToggleStatus: handleToggleStatus,
    onTogglePriority: handleTogglePriority,
    onToggleType: handleToggleType,
    onToggleAssignee: handleToggleAssignee,
    onToggleLabel: handleToggleLabel,
    onToggleCycle: handleToggleCycle,
    onToggleSprint: handleToggleSprint,
    onToggleProject: handleToggleProject,
    onDueDateFromChange: handleDueDateFromChange,
    onDueDateToChange: handleDueDateToChange,
  };

  const showSubmenu = hoveredCategory !== null && hoveredCategory !== "dates";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative shrink-0 gap-1.5 px-2.5 text-xs font-normal data-[state=open]:border-primary data-[state=open]:focus-visible:border-primary"
        >
          <ListFilter className="h-3.5 w-3.5 shrink-0" />
          <span>Add filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-auto max-w-[min(520px,var(--radix-popover-content-available-width))] overflow-hidden p-0",
          datesExpanded ? "min-w-[240px]" : "min-w-0",
        )}
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
          <div
            className="flex max-h-[min(480px,var(--radix-popover-content-available-height))]"
            onMouseLeave={handleMenuMouseLeave}
          >
            <motion.div
              layout={!shouldReduceMotion}
              transition={pmSnappy}
              className={cn(
                "flex w-fit shrink-0 flex-col",
                datesExpanded ? "min-w-[240px]" : "min-w-[148px]",
              )}
            >
              <Command
                shouldFilter={false}
                className={cn(
                  "h-auto shrink-0",
                  "[&_[cmdk-input-wrapper]]:h-9 [&_[cmdk-input-wrapper]]:gap-1.5 [&_[cmdk-input-wrapper]]:border-border [&_[cmdk-input-wrapper]]:px-2",
                  "[&_[cmdk-input-wrapper]]:transition-[background-color,box-shadow] [&_[cmdk-input-wrapper]]:duration-150 [&_[cmdk-input-wrapper]]:ease-out",
                  "[&_[cmdk-input-wrapper]:focus-within]:bg-primary/[0.04]",
                  "[&_[cmdk-input-wrapper]:focus-within]:shadow-[inset_0_-1px_0_0] [&_[cmdk-input-wrapper]:focus-within]:shadow-primary/40",
                  "motion-reduce:[&_[cmdk-input-wrapper]]:transition-none",
                )}
              >
                <CommandInput
                  placeholder="Filter by..."
                  className="text-xs"
                  value={search}
                  onValueChange={handleSearchChange}
                />
              </Command>
              <motion.div
                ref={categoryListRef}
                role="menu"
                aria-label="Filter categories"
                tabIndex={-1}
                className="overflow-y-auto px-0.5 py-0.5 outline-none"
                variants={listContainer}
                initial="hidden"
                animate="show"
              >
                {visibleCategories.map((cat) => {
                  const isHovered = hoveredCategory === cat.key;
                  const isDates = cat.key === "dates";
                  function onMouseEnter() { handleCategoryMouseEnter(cat.key); }
                  function onFocus() { handleCategoryFocus(cat.key); }
                  function onKeyDown(e: KeyboardEvent) { handleCategoryKeyDown(cat.key, e); }
                  return (
                    <motion.div
                      key={cat.key}
                      variants={shouldReduceMotion ? listItemReduced : listItem}
                      transition={pmSnappy}
                    >
                      <FilterCategoryRow
                        category={cat.key}
                        label={cat.label}
                        leading={cat.leading}
                        activeCount={cat.activeCount}
                        hovered={isHovered}
                        inlineExpand={isDates}
                        onMouseEnter={onMouseEnter}
                        onFocus={onFocus}
                        onKeyDown={onKeyDown}
                      />
                      <AnimatePresence initial={false}>
                        {isDates && isHovered && (
                          <motion.div
                            ref={datesInlineRef}
                            key="dates-inline"
                            initial={
                              shouldReduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, height: 0 }
                            }
                            animate={
                              shouldReduceMotion
                                ? { opacity: 1 }
                                : { opacity: 1, height: "auto" }
                            }
                            exit={
                              shouldReduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, height: 0 }
                            }
                            transition={pmSnappy}
                            className="overflow-hidden"
                          >
                            <FilterDatesInline
                              dueDateFrom={dueDateFrom}
                              dueDateTo={dueDateTo}
                              onDueDateFromChange={handleDueDateFromChange}
                              onDueDateToChange={handleDueDateToChange}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>

            <AnimatePresence initial={false}>
              {showSubmenu && hoveredCategory && (
                <motion.div
                  key={hoveredCategory}
                  ref={submenuRef}
                  tabIndex={-1}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: -8 }
                  }
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { opacity: 1, x: 0 }
                  }
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: -6 }
                  }
                  transition={pmSnappy}
                  className="max-w-[220px] overflow-y-auto border-l border-border bg-popover outline-none"
                >
                  <FilterCategorySubmenu
                    category={hoveredCategory}
                    onClose={handleSubmenuClose}
                    {...sharedProps}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
