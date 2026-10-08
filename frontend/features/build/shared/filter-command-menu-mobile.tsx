"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterCategorySubmenu } from "./filter-category-submenu";
import { FilterFlatSearch } from "./filter-flat-search";
import { AssigneeFilterSubmenu } from "./assignee-filter-submenu";
import {
  FilterTriggerButton,
  MobileFilterSearch,
  FilterCategoryList,
} from "@/components/list-view";
import { pmSnappy } from "@/lib/motion-presets";
import type { useFilterCommandMenuState } from "./use-filter-command-menu-state";

type MenuState = ReturnType<typeof useFilterCommandMenuState>;

interface FilterCommandMenuMobileProps {
  activeFilterCount: number;
  triggerLabel: string;
  presentation: "default" | "all-work";
  desktopIconOnly: boolean;
  showTypeFilter: boolean;
  showAssigneeFilter: boolean;
  open: boolean;
  handleOpenChange: (open: boolean) => void;
  activeCategory: string | null;
  isSearching: boolean;
  drillTitle: string;
  shouldReduceMotion: boolean | null;
  navDirection: number;
  mobilePanelKey: string;
  swipeHandlers: MenuState["swipeHandlers"];
  search: string;
  handleSearchChange: (value: string) => void;
  sharedProps: MenuState["sharedProps"];
  categoryListProps: MenuState["categoryListProps"];
  handleBackToCategories: () => void;
}

export function FilterCommandMenuMobile({
  activeFilterCount,
  triggerLabel,
  presentation,
  desktopIconOnly,
  showTypeFilter,
  showAssigneeFilter,
  open,
  handleOpenChange,
  activeCategory,
  isSearching,
  drillTitle,
  shouldReduceMotion,
  navDirection,
  mobilePanelKey,
  swipeHandlers,
  search,
  handleSearchChange,
  sharedProps,
  categoryListProps,
  handleBackToCategories,
}: FilterCommandMenuMobileProps) {
  const slideVariants = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: (direction: number) => ({ opacity: 0, x: direction * 8 }),
        animate: { opacity: 1, x: 0 },
        exit: (direction: number) => ({ opacity: 0, x: direction * -6 }),
      };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
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
            <DrawerTitle className="text-sm font-medium text-foreground">
              {isSearching ? "Search filters" : drillTitle}
            </DrawerTitle>
            {activeFilterCount > 0 && !activeCategory ? (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-dense font-medium text-primary-foreground">
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
                    showAssigneeFilter={showAssigneeFilter}
                    {...sharedProps}
                  />
                </div>
              ) : activeCategory ? (
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {activeCategory === "assignee" ? (
                    <AssigneeFilterSubmenu
                      selectedAssignees={sharedProps.selectedAssignees}
                      onToggleAssignee={sharedProps.onToggleAssignee}
                      onClose={handleBackToCategories}
                      showTitle={false}
                      className="w-full min-w-0"
                      listClassName="max-h-none overflow-visible p-1.5"
                    />
                  ) : (
                    <FilterCategorySubmenu
                      category={activeCategory}
                      onClose={handleBackToCategories}
                      showTitle={false}
                      className="w-full min-w-0"
                      listClassName="max-h-none overflow-visible p-1.5"
                      {...sharedProps}
                    />
                  )}
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
