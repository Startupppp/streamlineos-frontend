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
  collapseActionsOnSearchFocus?: boolean;
}

function ToolbarFilterSlot({
  filter,
  collapsed,
  fieldIndex,
  fieldFilterCount,
}: {
  filter: BuildToolbarFilter;
  collapsed: boolean;
  fieldIndex: number | null;
  fieldFilterCount: number;
}) {
  return (
    <div
      data-slot="build-toolbar-filter"
      data-filter-id={filter.id}
      className={cn(
        "min-w-0 w-auto shrink-0 basis-auto",
        fieldIndex === null
          ? "max-md:min-w-0 max-md:shrink-0"
          : toolbarInlineVisibility(fieldIndex, collapsed, fieldFilterCount),
      )}
    >
      {filter.control}
    </div>
  );
}

function ToolbarDrawerField({ filter }: { filter: BuildToolbarFilter }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-normal text-foreground">{filter.label}</span>
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
  collapseActionsOnSearchFocus = false,
}: BuildListToolbarProps) {
  const {
    value: searchValue,
    onValueChange: onSearchValueChange,
    placeholder: searchPlaceholder,
    label: searchLabel,
    inputRef: searchInputRef,
  } = search ?? {};
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
  });
  const showActions = !searchExpanded && (!collapseActionsOnSearchFocus || !searchFocused);

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
      {layout.filters.map((entry) => (
        <ToolbarFilterSlot
          key={entry.filter.id}
          filter={entry.filter}
          collapsed={entry.collapsed}
          fieldIndex={entry.fieldIndex}
          fieldFilterCount={layout.fieldFilterCount}
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
                  toolbarMoreButtonClass(layout.fieldFilterCount, layout.collapse),
                )}
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                <ResponsiveIconLabelText className="truncate">
                  {BUILD_TOOLBAR_FILTERS_LABEL}
                </ResponsiveIconLabelText>
                {layout.collapsedActiveCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-dense font-normal tabular-nums text-foreground">
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
              {layout.filters.map((entry) => {
                if (!isToolbarFieldFilter(entry.filter)) return null;
                const drawerClass = toolbarDrawerVisibility(
                  entry.fieldIndex ?? 0,
                  entry.collapsed,
                  layout.fieldFilterCount,
                );
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
      {search && searchValue !== undefined && onSearchValueChange ? (
        <SearchInput
          fill
          ref={searchInputRef}
          value={searchValue}
          onValueChange={onSearchValueChange}
          placeholder={searchPlaceholder}
          aria-label={searchLabel ?? searchPlaceholder}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          className={cn(
            "min-w-0 flex-1 basis-[12rem] md:max-w-md",
            searchExpanded && "max-md:max-w-none max-md:basis-auto",
          )}
        />
      ) : null}

      <AnimatePresence initial={false}>
        {showActions ? (
          <motion.div
            key="build-toolbar-actions"
            data-slot="build-toolbar-actions"
            className="flex shrink-0 flex-nowrap items-center gap-2"
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
