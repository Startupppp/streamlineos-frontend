"use client";

import {
  useState,
  useCallback,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Command, CommandInput } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useHorizontalSwipe } from "@/hooks/common/use-horizontal-swipe";
import { FilterCategorySubmenu } from "./filter-category-submenu";
import { FilterFlatSearch } from "./filter-flat-search";
import { FilterAssigneeLeading } from "./filter-option-leading";
import { FilterTriggerButton, MobileFilterSearch } from "@/features/shared/list-view";
import { FilterCategoryList } from "@/features/shared/list-view";
import {
  categoryTitle,
  type FilterCategory,
  type StatusFilterOption,
  type Member,
  type Label,
  type Cycle,
  type Sprint,
  type ProjectOption,
  type FilterState,
  type CategoryDefinition,
} from "@/features/shared/list-view";
import type { StatusConfigEntry } from "@/lib/status-config";
import {
  pmSnappy,
  stepSlide,
  stepSlideReduced,
} from "@/lib/motion-presets";

export type { FilterState } from "@/features/shared/list-view";

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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterCategory | null>(null);
  const [navDirection, setNavDirection] = useState(1);
  const submenuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

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
    { key: "status", label: "Status", visible: true, activeCount: selectedStatuses.length },
    { key: "priority", label: "Priority", visible: true, activeCount: selectedPriorities.length },
    { key: "type", label: "Type", visible: showTypeFilter, activeCount: selectedTypes.length },
    {
      key: "assignee",
      label: "Assignee",
      leading: resolveAssigneeLeading(),
      visible: showAssigneeFilter,
      activeCount: selectedAssignees.length,
    },
    { key: "label", label: "Label", visible: labels.length > 0, activeCount: selectedLabels.length },
    { key: "cycle", label: "Cycle", visible: cycles.length > 0, activeCount: selectedCycles.length },
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

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearch("");
      setActiveCategory(null);
    }
  }, []);

  const firstCategoryKey = visibleCategories[0]?.key ?? null;
  const resolvedCategory =
    activeCategory ??
    (!isMobile && open && !isSearching ? firstCategoryKey : null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.trim().length > 0) {
      setActiveCategory(null);
    }
  }

  function handleSelectCategory(key: FilterCategory) {
    setNavDirection(1);
    setActiveCategory(key);
    setSearch("");
  }

  function handleCategoryKeyDown(key: FilterCategory, e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectCategory(key);
      setTimeout(() => {
        submenuRef.current?.focus();
      }, 0);
    }
  }

  function handleSubmenuClose() {
    setNavDirection(-1);
    setActiveCategory(null);
    categoryListRef.current?.focus();
  }

  function handleBackToCategories() {
    setNavDirection(-1);
    setActiveCategory(null);
    setSearch("");
  }

  const handleSwipeLeft = useCallback(() => {
    if (search.trim().length > 0) return;
    if (!activeCategory) {
      const first = visibleCategories[0];
      if (!first) return;
      setNavDirection(1);
      setActiveCategory(first.key);
      return;
    }
    const idx = visibleCategories.findIndex((c) => c.key === activeCategory);
    const next = idx >= 0 ? visibleCategories[idx + 1] : undefined;
    if (!next) return;
    setNavDirection(1);
    setActiveCategory(next.key);
  }, [activeCategory, search, visibleCategories]);

  const handleSwipeRight = useCallback(() => {
    if (search.trim().length > 0) return;
    if (!activeCategory) return;
    const idx = visibleCategories.findIndex((c) => c.key === activeCategory);
    if (idx <= 0) {
      setNavDirection(-1);
      setActiveCategory(null);
      return;
    }
    const prev = visibleCategories[idx - 1];
    if (!prev) return;
    setNavDirection(-1);
    setActiveCategory(prev.key);
  }, [activeCategory, search, visibleCategories]);

  const swipeHandlers = useHorizontalSwipe({
    enabled: isMobile && open && search.trim().length === 0,
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  const mobilePanelKey = search.trim().length > 0
    ? "search"
    : activeCategory ?? "categories";

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

  const categoryListProps = {
    visibleCategories,
    resolvedCategory,
    containerRef: categoryListRef,
    isMobile,
    shouldReduceMotion,
    onSelectCategory: handleSelectCategory,
    onCategoryKeyDown: handleCategoryKeyDown,
  };

  if (isMobile) {
    const drillTitle = activeCategory
      ? categoryTitle(activeCategory)
      : "Filters";
    const slideVariants = shouldReduceMotion ? stepSlideReduced : stepSlide;

    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          <FilterTriggerButton activeFilterCount={activeFilterCount} />
        </DrawerTrigger>
        <DrawerContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
          <DrawerHeader className="shrink-0 border-b border-border px-3 py-3 text-left">
            <div className="flex items-center gap-2">
              {activeCategory && !isSearching ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Back to filter categories"
                  onClick={handleBackToCategories}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <DrawerTitle className="text-sm font-semibold text-foreground">
                {isSearching ? "Search filters" : drillTitle}
              </DrawerTitle>
              {activeFilterCount > 0 && !activeCategory ? (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </div>
          </DrawerHeader>

          <div
            className="flex min-h-0 flex-1 flex-col touch-pan-y"
            {...swipeHandlers}
          >
            <AnimatePresence initial={false} mode="wait" custom={navDirection}>
              <motion.div
                key={mobilePanelKey}
                custom={navDirection}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pmSnappy}
                className="flex min-h-0 flex-1 flex-col"
              >
                {isSearching ? (
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <FilterFlatSearch
                      search={search}
                      onSearchChange={handleSearchChange}
                      showTypeFilter={showTypeFilter}
                      showSprintFilter={showSprintFilter}
                      showAssigneeFilter={showAssigneeFilter}
                      {...sharedProps}
                    />
                  </div>
                ) : activeCategory ? (
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <FilterCategorySubmenu
                      category={activeCategory}
                      onClose={handleBackToCategories}
                      showTitle={false}
                      className="w-full min-w-0"
                      listClassName="max-h-none overflow-visible p-1.5"
                      {...sharedProps}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <MobileFilterSearch value={search} onValueChange={handleSearchChange} />
                    <FilterCategoryList {...categoryListProps} dense={false} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  const filterTriggerLabel =
    activeFilterCount > 0
      ? `Add filter (${activeFilterCount} active)`
      : "Add filter";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <FilterTriggerButton activeFilterCount={activeFilterCount} />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs md:hidden">
            {filterTriggerLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-auto max-w-[min(560px,var(--radix-popover-content-available-width))] overflow-hidden rounded-xl border border-border bg-card p-0 shadow-lg"
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
          <div className="flex max-h-[min(480px,var(--radix-popover-content-available-height))]">
            <div className="flex w-[200px] shrink-0 flex-col border-r border-border">
              <Command
                shouldFilter={false}
                className={cn(
                  "h-auto shrink-0",
                  "[&_[cmdk-input-wrapper]]:h-10 [&_[cmdk-input-wrapper]]:gap-2 [&_[cmdk-input-wrapper]]:border-border [&_[cmdk-input-wrapper]]:px-3",
                  "[&_[cmdk-input-wrapper]]:transition-[background-color,box-shadow] [&_[cmdk-input-wrapper]]:duration-150 [&_[cmdk-input-wrapper]]:ease-out",
                  "[&_[cmdk-input-wrapper]:focus-within]:bg-primary/[0.04]",
                  "[&_[cmdk-input-wrapper]:focus-within]:shadow-[inset_0_-1px_0_0] [&_[cmdk-input-wrapper]:focus-within]:shadow-primary/40",
                  "motion-reduce:[&_[cmdk-input-wrapper]]:transition-none",
                )}
              >
                <CommandInput
                  placeholder="Filter by…"
                  className="h-10 text-sm"
                  value={search}
                  onValueChange={handleSearchChange}
                />
              </Command>
              <FilterCategoryList {...categoryListProps} dense />
            </div>

            <AnimatePresence initial={false} mode="wait">
              {resolvedCategory ? (
                <motion.div
                  key={resolvedCategory}
                  ref={submenuRef}
                  tabIndex={-1}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 6 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -4 }}
                  transition={pmSnappy}
                  className="min-w-0 overflow-y-auto bg-muted/15 outline-none"
                >
                  <FilterCategorySubmenu
                    category={resolvedCategory}
                    onClose={handleSubmenuClose}
                    showTitle
                    className="w-[280px]"
                    {...sharedProps}
                  />
                </motion.div>
              ) : (
                <div className="flex w-[280px] items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
                  Select a filter to refine tickets.
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
