"use client";

import type { ReactNode } from "react";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  filters?: FiltersSlot;
  actions?: ReactNode;
  tabsDensity?: PageTabsDensity;
  collapseBelow?: PageTabsCollapseBelow;
  filtersAlwaysVisible?: boolean;
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

export function PageTabsToolbar({
  tabs,
  search,
  filters,
  actions,
  tabsDensity = "labeled",
  collapseBelow = "md",
  filtersAlwaysVisible = false,
  className,
}: PageTabsToolbarProps) {
  const hasFilters = filters !== undefined && filters !== null;
  const isLabeled = tabsDensity === "labeled";

  const searchField = search ? (
    <div className="min-w-[12rem] flex-1 basis-[14rem]">{search}</div>
  ) : null;

  const filterControls = hasFilters ? (
    <>
      <div className={inlineFilterClass(collapseBelow, filtersAlwaysVisible)}>
        {resolveSlot(filters)}
      </div>
      {!filtersAlwaysVisible ? (
        <ResponsivePopover>
          <ResponsivePopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("h-9 shrink-0 gap-1.5 px-2.5", filtersButtonClass(collapseBelow))}
              aria-label="Filters"
            >
              <ListFilter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </ResponsivePopoverTrigger>
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
      ) : null}
    </>
  ) : null;

  const actionCluster = actions ? (
    <div className="flex shrink-0 items-center gap-2">{actions}</div>
  ) : null;

  if (!isLabeled) {
    return (
      <div className={cn("flex w-full min-w-0 flex-wrap items-center gap-2", className)}>
        <div className="min-w-0">{tabs}</div>
        {searchField}
        {filterControls}
        {actionCluster}
      </div>
    );
  }

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
      <div className="w-full min-w-0">{tabs}</div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
        {searchField}
        {filterControls}
        {actionCluster}
      </div>
    </div>
  );
}
