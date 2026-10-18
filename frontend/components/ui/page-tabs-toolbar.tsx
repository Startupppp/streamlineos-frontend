"use client";

import type { ReactNode } from "react";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MobileOnlyLabelTooltip,
} from "@/components/ui/responsive-icon-label";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";

export type PageTabsDensity = "labeled" | "icons";
export type PageTabsCollapseBelow = "md" | "lg" | "xl";

type FiltersSlot = ReactNode | (() => ReactNode);

interface PageTabsToolbarProps {
  tabs: ReactNode;
  search?: ReactNode;
  /** Always shown inline (e.g. at most two primary selects). */
  primaryFilters?: FiltersSlot;
  /**
   * Extra filters. With `primaryFilters`, these stay in the Filters dropdown
   * at every breakpoint. Without `primaryFilters`, they follow `collapseBelow`.
   */
  filters?: FiltersSlot;
  actions?: ReactNode;
  tabsDensity?: PageTabsDensity;
  collapseBelow?: PageTabsCollapseBelow;
  filtersAlwaysVisible?: boolean;
  searchClassName?: string;
  className?: string;
}

function resolveSlot(slot: FiltersSlot | undefined): ReactNode {
  if (slot === undefined) return null;
  return typeof slot === "function" ? slot() : slot;
}

function inlineFilterClass(collapseBelow: PageTabsCollapseBelow, always: boolean): string {
  if (always) return "contents";
  if (collapseBelow === "xl") return "hidden xl:contents";
  if (collapseBelow === "lg") return "hidden lg:contents";
  return "hidden md:contents";
}

function filtersButtonClass(collapseBelow: PageTabsCollapseBelow): string {
  if (collapseBelow === "xl") return "xl:hidden";
  if (collapseBelow === "lg") return "lg:hidden";
  return "md:hidden";
}

function FiltersMenu({
  filters,
  triggerAlwaysVisible,
  collapseBelow,
}: {
  filters: FiltersSlot;
  triggerAlwaysVisible: boolean;
  collapseBelow: PageTabsCollapseBelow;
}) {
  return (
    <ResponsivePopover>
      <MobileOnlyLabelTooltip label="Filters">
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "size-9 shrink-0 p-0",
              !triggerAlwaysVisible && filtersButtonClass(collapseBelow),
            )}
            aria-label="Filters"
          >
            <ListFilter className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Button>
        </ResponsivePopoverTrigger>
      </MobileOnlyLabelTooltip>
      <ResponsivePopoverContent
        title="Filters"
        align="end"
        className="w-[min(18rem,calc(100vw-2rem))] space-y-2 p-3"
      >
        <div className="flex flex-col gap-2 [&_.contents]:flex [&_.contents]:flex-col [&_.contents]:gap-2">
          {resolveSlot(filters)}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

export function PageTabsToolbar({
  tabs,
  search,
  primaryFilters,
  filters,
  actions,
  tabsDensity = "labeled",
  collapseBelow = "md",
  filtersAlwaysVisible = false,
  searchClassName,
  className,
}: PageTabsToolbarProps) {
  const hasPrimary = primaryFilters !== undefined && primaryFilters !== null;
  const hasMore = filters !== undefined && filters !== null;
  const isLabeled = tabsDensity === "labeled";
  const moreAlwaysInMenu = hasPrimary && hasMore;

  const searchField = search ? (
    <div
      data-slot="page-tabs-toolbar-search"
      className={cn(
        "min-w-0 w-[min(100%,16rem)] flex-1 basis-[10rem] sm:max-w-[16rem]",
        searchClassName,
      )}
    >
      {search}
    </div>
  ) : null;

  const filterControls =
    hasPrimary || hasMore ? (
      <>
        {hasPrimary ? (
          <div className="contents">{resolveSlot(primaryFilters)}</div>
        ) : null}
        {hasMore && moreAlwaysInMenu ? (
          <FiltersMenu
            filters={filters}
            triggerAlwaysVisible
            collapseBelow={collapseBelow}
          />
        ) : null}
        {hasMore && !moreAlwaysInMenu ? (
          <>
            <div className={inlineFilterClass(collapseBelow, filtersAlwaysVisible)}>
              {resolveSlot(filters)}
            </div>
            {!filtersAlwaysVisible ? (
              <FiltersMenu
                filters={filters}
                triggerAlwaysVisible={false}
                collapseBelow={collapseBelow}
              />
            ) : null}
          </>
        ) : null}
      </>
    ) : null;

  const actionCluster = actions ? (
    <div className="flex max-w-full shrink-0 items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide">
      {actions}
    </div>
  ) : null;

  const tabsWithSearch = (
    <div
      data-slot="page-tabs-toolbar-tabs"
      className="flex min-w-0 flex-1 items-center gap-2 md:flex-none"
    >
      <div className="shrink-0">{tabs}</div>
      {searchField}
    </div>
  );

  if (!isLabeled) {
    return (
      <div className={cn("flex w-full min-w-0 flex-wrap items-center gap-2", className)}>
        {tabsWithSearch}
        {filterControls}
        {actionCluster}
      </div>
    );
  }

  return (
    <div
      data-slot="page-tabs-toolbar"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:gap-2",
        className,
      )}
    >
      {tabsWithSearch}
      <div
        data-slot="page-tabs-toolbar-controls"
        className="flex w-full min-w-0 flex-wrap items-center gap-2 md:ml-auto md:w-auto md:justify-end"
      >
        {filterControls}
        {actionCluster}
      </div>
    </div>
  );
}
