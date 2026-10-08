"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FilterCategorySubmenu } from "./filter-category-submenu";
import { FilterFlatSearch } from "./filter-flat-search";
import { FilterAssigneeLeading } from "./filter-option-leading";
import { AssigneeFilterSubmenu } from "./assignee-filter-submenu";
import {
  FilterTriggerButton,
  FilterCategoryList,
} from "@/components/list-view";
import { pmSnappy } from "@/lib/motion-presets";
import { useFilterCommandMenuState } from "./use-filter-command-menu-state";
import { FilterCommandMenuMobile } from "./filter-command-menu-mobile";
import type { FilterCommandMenuProps } from "./filter-command-menu-types";

export type { FilterState } from "@/components/list-view";
export type { FilterCommandMenuProps } from "./filter-command-menu-types";

export function FilterCommandMenu({
  activeFilterCount,
  defaultOpen,
  presentation = "default",
  simplifySingleOptionCategories = true,
  triggerLabel = "Add filter",
  desktopIconOnly = false,
  statusItems,
  statusConfig,
  members,
  labels,
  cycles,
  projectOptions,
  showTypeFilter,
  showAssigneeFilter,
  filterState,
  onToggleStatus,
  onTogglePriority,
  onToggleType,
  onToggleAssignee,
  onToggleLabel,
  onToggleCycle,
  onToggleProject,
  onDueDateFromChange,
  onDueDateToChange,
}: FilterCommandMenuProps) {
  function resolveAssigneeLeading(): ReactNode | undefined {
    const { selectedAssignees } = filterState;
    if (selectedAssignees.length !== 1) return undefined;
    const id = selectedAssignees[0];
    if (!id) return undefined;
    if (id === "@me" || id === "__unassigned__")
      return <FilterAssigneeLeading assigneeId={id} />;
    const member = members.find((m) => m.id === id);
    if (!member) return undefined;
    return <FilterAssigneeLeading assigneeId={id} member={member} />;
  }

  const {
    isMobile,
    open,
    handleOpenChange,
    search,
    handleSearchChange,
    activeCategory,
    navDirection,
    shouldReduceMotion,
    isSearching,
    resolvedCategory,
    mobilePanelKey,
    drillTitle,
    submenuRef,
    swipeHandlers,
    handleBackToCategories,
    handleSubmenuClose,
    sharedProps,
    categoryListProps,
  } = useFilterCommandMenuState({
    defaultOpen,
    simplifySingleOptionCategories,
    assigneeLeading: resolveAssigneeLeading(),
    statusItems,
    statusConfig,
    members,
    labels,
    cycles,
    projectOptions,
    showTypeFilter,
    showAssigneeFilter,
    filterState,
    onToggleStatus,
    onTogglePriority,
    onToggleType,
    onToggleAssignee,
    onToggleLabel,
    onToggleCycle,
    onToggleProject,
    onDueDateFromChange,
    onDueDateToChange,
  });

  if (isMobile) {
    return (
      <FilterCommandMenuMobile
        activeFilterCount={activeFilterCount}
        triggerLabel={triggerLabel}
        presentation={presentation}
        desktopIconOnly={desktopIconOnly}
        showTypeFilter={showTypeFilter}
        showAssigneeFilter={showAssigneeFilter}
        open={open}
        handleOpenChange={handleOpenChange}
        activeCategory={activeCategory}
        isSearching={isSearching}
        drillTitle={drillTitle}
        shouldReduceMotion={shouldReduceMotion}
        navDirection={navDirection}
        mobilePanelKey={mobilePanelKey}
        swipeHandlers={swipeHandlers}
        search={search}
        handleSearchChange={handleSearchChange}
        sharedProps={sharedProps}
        categoryListProps={categoryListProps}
        handleBackToCategories={handleBackToCategories}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <FilterTriggerButton
                activeFilterCount={activeFilterCount}
                label={triggerLabel}
                showLabelOnMobile={presentation === "all-work"}
                desktopIconOnly={desktopIconOnly}
                className={cn(
                  presentation === "all-work" &&
                    (desktopIconOnly
                      ? "h-9 w-full flex-1 justify-center rounded-lg px-3 max-lg:!w-full max-lg:!flex-1 lg:size-9 lg:min-w-0 lg:flex-none lg:px-0"
                      : "h-9 w-auto min-w-28 rounded-lg border-border/80 bg-muted/45 px-3 font-medium shadow-sm hover:border-primary/35 hover:bg-muted/70"),
                )}
              />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs md:hidden">
            {activeFilterCount > 0
              ? `${triggerLabel} (${activeFilterCount} active)`
              : triggerLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className={cn(
          "w-auto max-w-[min(560px,var(--radix-popover-content-available-width))] overflow-hidden rounded-xl border border-border bg-card p-0 shadow-lg",
          presentation === "all-work" &&
            "w-[min(32rem,calc(100vw-2rem))] max-w-[min(32rem,var(--radix-popover-content-available-width))] rounded-xl border-border/80 shadow-xl",
        )}
      >
        {isSearching ? (
          <FilterFlatSearch
            search={search}
            onSearchChange={handleSearchChange}
            showTypeFilter={showTypeFilter}
            showAssigneeFilter={showAssigneeFilter}
            {...sharedProps}
          />
        ) : (
          <div className="flex max-h-[min(420px,var(--radix-popover-content-available-height))] min-w-0">
            <div
              className={cn(
                "flex w-[200px] shrink-0 flex-col border-r border-border",
                presentation === "all-work" && "w-44 bg-muted/15",
              )}
            >
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
                  aria-label="Search filter options"
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
                  className="min-w-0 flex-1 overflow-y-auto bg-card outline-none"
                >
                  {resolvedCategory === "assignee" ? (
                    <AssigneeFilterSubmenu
                      selectedAssignees={sharedProps.selectedAssignees}
                      onToggleAssignee={sharedProps.onToggleAssignee}
                      onClose={handleSubmenuClose}
                      showTitle
                      className={cn("w-[280px]", presentation === "all-work" && "w-full min-w-0")}
                    />
                  ) : (
                    <FilterCategorySubmenu
                      category={resolvedCategory}
                      onClose={handleSubmenuClose}
                      showTitle
                      className={cn("w-[280px]", presentation === "all-work" && "w-full min-w-0")}
                      {...sharedProps}
                    />
                  )}
                </motion.div>
              ) : (
                <div className="flex min-w-[280px] flex-1 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
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
