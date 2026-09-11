"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { FilterCategorySubmenu } from "./filter-category-submenu";
import { FilterFlatSearch } from "./filter-flat-search";
import { FilterAssigneeLeading } from "./filter-option-leading";
import {
  FilterTriggerButton,
  MobileFilterSearch,
  FilterCategoryList,
} from "@/components/list-view";
import { pmSnappy, stepSlide, stepSlideReduced } from "@/lib/motion-presets";
import { useFilterCommandMenuState } from "./use-filter-command-menu-state";
import type { FilterCommandMenuProps } from "./filter-command-menu-types";

export type { FilterState } from "@/components/list-view";
export type { FilterCommandMenuProps } from "./filter-command-menu-types";

export function FilterCommandMenu({
  activeFilterCount,
  defaultOpen,
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
    assigneeLeading: resolveAssigneeLeading(),
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
  });

  if (isMobile) {
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
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-dense font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </div>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col touch-pan-y" {...swipeHandlers}>
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
            {activeFilterCount > 0 ? `Add filter (${activeFilterCount} active)` : "Add filter"}
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
