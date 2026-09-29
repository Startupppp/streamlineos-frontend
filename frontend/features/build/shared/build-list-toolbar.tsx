"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import { SearchInput } from "@/components/ui/search-input";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { pmSnappy } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";
import {
  BUILD_TOOLBAR_CLEAR_LABEL,
  BUILD_TOOLBAR_DRAWER_DESCRIPTION,
  BUILD_TOOLBAR_FILTERS_LABEL,
  BUILD_TOOLBAR_ROOT_CLASS,
  BUILD_TOOLBAR_TRAILING_CLASS,
  buildToolbarLayout,
  isToolbarFieldFilter,
  isToolbarMobileSearchExpanded,
  toolbarDrawerVisibility,
  toolbarInlineVisibility,
  toolbarMoreButtonClass,
  type BuildToolbarFilter,
  type BuildToolbarSearch,
} from "./build-list-toolbar-layout";

interface BuildListToolbarProps {
  search?: BuildToolbarSearch;
  filters?: readonly BuildToolbarFilter[];
  trailing?: ReactNode;
  onClearAll?: () => void;
  drawerTitle?: string;
  className?: string;
}

function ToolbarFilterSlot({
  filter,
  collapsed,
  index,
}: {
  filter: BuildToolbarFilter;
  collapsed: boolean;
  index: number;
}) {
  return (
    <div
      data-slot="build-toolbar-filter"
      data-filter-id={filter.id}
      className={cn(
        "min-w-0 w-auto shrink-0 basis-auto",
        toolbarInlineVisibility(index, collapsed),
      )}
    >
      {filter.control}
    </div>
  );
}

function ToolbarDrawerField({ filter }: { filter: BuildToolbarFilter }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{filter.label}</span>
      <div className="[&_[data-slot=select-trigger]]:w-full">{filter.control}</div>
    </div>
  );
}

export function BuildListToolbar({
  search,
  filters,
  trailing,
  onClearAll,
  drawerTitle = BUILD_TOOLBAR_FILTERS_LABEL,
  className,
}: BuildListToolbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const drawerBodyRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const layout = buildToolbarLayout({ search, filters });
  const showDrawer = layout.collapse || layout.fieldFilterCount > 1;
  const searchExpanded = isToolbarMobileSearchExpanded({
    isMobile,
    focused: searchFocused,
    value: search?.value,
  });
  const showActions = !searchExpanded;

  useEffect(() => {
    if (!drawerOpen) return;
    const frame = window.requestAnimationFrame(() => {
      drawerBodyRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [drawerOpen]);

  const handleClearAll = useCallback(() => {
    onClearAll?.();
    setDrawerOpen(false);
  }, [onClearAll]);

  const handleSearchFocus = useCallback(() => {
    setSearchFocused(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setSearchFocused(false);
  }, []);

  const showClear = Boolean(onClearAll) && layout.anyActive;
  const actionTransition = shouldReduceMotion
    ? { duration: 0 }
    : pmSnappy;
  const actionInitial = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, x: 8 };
  const actionAnimate = shouldReduceMotion
    ? { opacity: 1 }
    : { opacity: 1, x: 0 };

  const actions = (
    <>
      {layout.filters.map((entry, index) => (
        <ToolbarFilterSlot
          key={entry.filter.id}
          filter={entry.filter}
          collapsed={entry.collapsed}
          index={index}
        />
      ))}

      {showDrawer ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <MobileOnlyLabelTooltip label={BUILD_TOOLBAR_FILTERS_LABEL}>
            <DrawerTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label={BUILD_TOOLBAR_FILTERS_LABEL}
                className={cn(
                  "justify-center",
                  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
                  toolbarMoreButtonClass(layout.filters.length, layout.collapse),
                )}
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                <ResponsiveIconLabelText className="truncate">
                  {BUILD_TOOLBAR_FILTERS_LABEL}
                </ResponsiveIconLabelText>
                {layout.collapsedActiveCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-dense font-medium tabular-nums text-foreground">
                    {layout.collapsedActiveCount}
                  </span>
                ) : null}
              </Button>
            </DrawerTrigger>
          </MobileOnlyLabelTooltip>
          <DrawerContent className="max-h-[85dvh] gap-0">
            <DrawerHeader className="shrink-0 border-b border-border text-left">
              <DrawerTitle className="text-base">{drawerTitle}</DrawerTitle>
              <DrawerDescription className="text-label">
                {BUILD_TOOLBAR_DRAWER_DESCRIPTION}
              </DrawerDescription>
            </DrawerHeader>
            <div
              ref={drawerBodyRef}
              tabIndex={-1}
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 outline-none"
            >
              {layout.filters.map((entry, index) => {
                if (!isToolbarFieldFilter(entry.filter)) return null;
                const drawerClass = toolbarDrawerVisibility(index, entry.collapsed);
                if (drawerClass === "hidden") return null;
                return (
                  <div key={entry.filter.id} className={drawerClass}>
                    <ToolbarDrawerField filter={entry.filter} />
                  </div>
                );
              })}
            </div>
            <DrawerFooter className="shrink-0 border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div
                className={cn(
                  "grid gap-2",
                  showClear ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                {showClear ? (
                  <Button type="button" variant="outline" onClick={handleClearAll}>
                    {BUILD_TOOLBAR_CLEAR_LABEL}
                  </Button>
                ) : null}
                <DrawerClose asChild>
                  <Button type="button">Done</Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : null}

      {trailing ? (
        <div className={BUILD_TOOLBAR_TRAILING_CLASS}>{trailing}</div>
      ) : null}
    </>
  );

  return (
    <div
      data-slot="build-list-toolbar"
      className={cn(BUILD_TOOLBAR_ROOT_CLASS, layout.mobileColumns, className)}
    >
      {search ? (
        <SearchInput
          fill
          ref={search.inputRef}
          value={search.value}
          onValueChange={search.onValueChange}
          placeholder={search.placeholder}
          aria-label={search.label ?? search.placeholder}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          className={cn(
            "min-w-0 flex-1 basis-0 md:min-w-[12rem] md:max-w-xs md:basis-[12rem] lg:max-w-sm",
            searchExpanded && "max-md:max-w-none max-md:basis-auto",
          )}
        />
      ) : null}

      <AnimatePresence initial={false}>
        {showActions ? (
          <motion.div
            key="build-toolbar-actions"
            data-slot="build-toolbar-actions"
            className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 md:min-w-0 md:flex-1"
            initial={actionInitial}
            animate={actionAnimate}
            exit={actionInitial}
            transition={actionTransition}
          >
            {actions}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
