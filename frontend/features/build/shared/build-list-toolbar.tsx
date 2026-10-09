"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
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
  fillMobileActions?: boolean;
}

function ToolbarFilterSlot({
  filter,
  collapsed,
  fieldIndex,
  fieldFilterCount,
  searchCollapsed,
}: {
  filter: BuildToolbarFilter;
  collapsed: boolean;
  fieldIndex: number | null;
  fieldFilterCount: number;
  searchCollapsed: boolean;
}) {
  return (
    <div
      data-slot="build-toolbar-filter"
      data-filter-id={filter.id}
      className={cn(
        "min-w-0 w-auto shrink-0 basis-auto transition-[flex-basis,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        searchCollapsed && "flex-1 basis-0 [&_[data-slot=select-trigger]]:!w-full [&_[data-slot=select-trigger]]:!min-w-0 [&_[data-slot=select-trigger]]:!max-w-none",
        fieldIndex === null
          ? "max-md:min-w-0 max-md:shrink-0"
          : toolbarInlineVisibility(fieldIndex, collapsed, fieldFilterCount),
      )}
    >
      {filter.control}
    </div>
  );
}

function ToolbarOverflowField({ filter }: { filter: BuildToolbarFilter }) {
  return (
    <div
      data-slot="build-toolbar-drawer-field"
      className="flex w-full min-w-0 flex-col gap-1.5"
    >
      <span className="text-sm font-normal text-foreground">{filter.label}</span>
      <div className="w-full min-w-0 [&>*]:w-full [&>*]:max-w-none [&_[data-slot=select-trigger]]:w-full">
        {filter.control}
      </div>
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
  fillMobileActions = false,
}: BuildListToolbarProps) {
  const {
    value: searchValue,
    onValueChange: onSearchValueChange,
    placeholder: searchPlaceholder,
    label: searchLabel,
    inputRef: searchInputRef,
    inputClassName: searchInputClassName,
  } = search ?? {};
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const overflowBodyRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const layout = buildToolbarLayout({ search, filters });
  const showDrawer = layout.fieldFilterCount > 0;
  const searchExpanded = isToolbarMobileSearchExpanded({
    isMobile,
    focused: searchFocused,
  });
  const searchCollapsed =
    collapseActionsOnSearchFocus && !searchFocused && !searchValue;
  // Tablet/desktop search expansion must not make filters unreachable. Only the
  // true mobile full-width search state temporarily hides the action row.
  const showActions = !searchExpanded;

  useEffect(() => {
    if (!filtersOpen) return;
    const frame = window.requestAnimationFrame(() => {
      overflowBodyRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filtersOpen]);

  const handleClearAll = useCallback(() => {
    onClearAll?.();
    setFiltersOpen(false);
  }, [onClearAll]);

  const handleCloseFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);

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
          searchCollapsed={searchCollapsed}
        />
      ))}

      {showDrawer ? (
        <ResponsivePopover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <MobileOnlyLabelTooltip label={BUILD_TOOLBAR_FILTERS_LABEL}>
            <ResponsivePopoverTrigger asChild>
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
                {layout.activeCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-dense font-normal tabular-nums text-foreground">
                    {layout.activeCount}
                  </span>
                ) : null}
              </Button>
            </ResponsivePopoverTrigger>
          </MobileOnlyLabelTooltip>
          <ResponsivePopoverContent
            align="end"
            title={drawerTitle}
            description={BUILD_TOOLBAR_DRAWER_DESCRIPTION}
            drawerClassName="w-full max-w-none"
            stickyFooter
            className="flex max-h-[min(36rem,calc(100dvh-2rem))] w-[min(28rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border px-4 py-3 text-left">
                <h2 className="text-base font-semibold">{drawerTitle}</h2>
                <p className="mt-1 text-label text-muted-foreground">
                  {BUILD_TOOLBAR_DRAWER_DESCRIPTION}
                </p>
              </div>
              <div
                ref={overflowBodyRef}
                tabIndex={-1}
                data-slot="build-toolbar-drawer-body"
                className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-y-auto p-4 outline-none"
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
                      <ToolbarOverflowField filter={entry.filter} />
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                  <Button type="button" onClick={handleCloseFilters}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </ResponsivePopoverContent>
        </ResponsivePopover>
      ) : null}

      {trailing ? (
        <div className={BUILD_TOOLBAR_TRAILING_CLASS}>{trailing}</div>
      ) : null}
    </>
  );

  return (
    <div
      data-slot="build-list-toolbar"
      data-search-collapsed={searchCollapsed || undefined}
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
          compact={searchCollapsed}
          inputClassName={searchInputClassName}
          className={cn(
            "min-w-0 flex-1 basis-[12rem] md:max-w-md transition-[flex-basis,width,max-width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            searchExpanded && "max-md:max-w-none max-md:basis-auto",
          )}
        />
      ) : null}

      <AnimatePresence initial={false} mode="popLayout">
        {showActions ? (
          <motion.div
            key="build-toolbar-actions"
            data-slot="build-toolbar-actions"
            className={cn(
              "flex shrink-0 flex-nowrap items-center gap-2 transition-[flex-basis,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              searchCollapsed && "flex-1",
              fillMobileActions && "max-md:w-full max-md:justify-between",
            )}
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
