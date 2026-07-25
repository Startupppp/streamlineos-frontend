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

type FiltersSlot = ReactNode | (() => ReactNode);

interface PageTabsToolbarProps {
  tabs: ReactNode;
  search?: ReactNode;
  filters?: FiltersSlot;
  actions?: ReactNode;
  tabsDensity?: PageTabsDensity;
  className?: string;
}

function resolveSlot(slot: FiltersSlot | undefined): ReactNode {
  if (slot === undefined) return null;
  return typeof slot === "function" ? slot() : slot;
}

export function PageTabsToolbar({
  tabs,
  search,
  filters,
  actions,
  tabsDensity = "labeled",
  className,
}: PageTabsToolbarProps) {
  const hasFilters = filters !== undefined && filters !== null;
  const isLabeled = tabsDensity === "labeled";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 gap-2",
        isLabeled
          ? "flex-col md:flex-row md:flex-nowrap md:items-center md:justify-between"
          : "flex-row flex-nowrap items-center justify-between",
        className,
      )}
    >
      <div
        className={cn(
          "min-w-0 shrink-0 overflow-x-auto scrollbar-hide",
          isLabeled ? "w-full md:w-auto" : "shrink-0",
        )}
      >
        {tabs}
      </div>

      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          isLabeled
            ? "w-full md:ml-auto md:w-auto md:max-w-full md:justify-end"
            : "ml-auto min-w-0 shrink-0 justify-end",
        )}
      >
        {search ? (
          <div
            className={cn(
              "min-w-0",
              isLabeled
                ? "flex-1 md:w-[240px] md:max-w-sm md:flex-none"
                : "w-[200px] sm:w-[240px]",
            )}
          >
            {search}
          </div>
        ) : null}

        {hasFilters ? (
          <>
            <div className="hidden min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide md:flex [&>*]:shrink-0">
              {resolveSlot(filters)}
            </div>
            <ResponsivePopover>
              <ResponsivePopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 px-2.5 md:hidden"
                  aria-label="Filters"
                >
                  <ListFilter className="h-4 w-4" />
                  <span className="text-xs">Filters</span>
                </Button>
              </ResponsivePopoverTrigger>
              <ResponsivePopoverContent
                title="Filters"
                align="end"
                className="w-[min(18rem,calc(100vw-2rem))] space-y-2 p-3"
              >
                <div className="flex flex-col gap-2">
                  {resolveSlot(filters)}
                </div>
              </ResponsivePopoverContent>
            </ResponsivePopover>
          </>
        ) : null}

        {actions ? (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
