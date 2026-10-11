"use client";

import { cn } from "@/lib/utils";
import { toolbarInlineVisibility, type BuildToolbarFilter, type BuildToolbarRow } from "./build-list-toolbar-layout";

export function ToolbarFilterSlot({
  filter,
  collapsed,
  fieldIndex,
  fieldFilterCount,
  searchCollapsed,
  row,
}: {
  filter: BuildToolbarFilter;
  collapsed: boolean;
  fieldIndex: number | null;
  fieldFilterCount: number;
  searchCollapsed: boolean;
  row?: BuildToolbarRow;
}) {
  return (
    <div
      data-slot="build-toolbar-filter"
      data-filter-id={filter.id}
      className={cn(
        "min-w-0 w-auto basis-auto transition-[flex-basis,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        row
          ? "md:min-w-0 md:shrink md:basis-0 md:flex-1 md:[&_[data-slot=select-trigger]]:!w-full md:[&_[data-slot=select-trigger]]:!min-w-0 md:[&_[data-slot=select-trigger]]:!max-w-none"
          : "md:shrink-0",
        searchCollapsed &&
          "flex-1 basis-0 [&_[data-slot=select-trigger]]:!w-full [&_[data-slot=select-trigger]]:!min-w-0 [&_[data-slot=select-trigger]]:!max-w-none",
        fieldIndex === null
          ? "max-md:min-w-0 max-md:shrink-0"
          : cn(
              toolbarInlineVisibility(fieldIndex, collapsed, fieldFilterCount, row),
              fieldIndex < 2 &&
                "max-md:min-w-0 max-md:flex-1 max-md:basis-0 max-md:[&_[data-slot=select-trigger]]:w-full max-md:[&_[data-slot=select-trigger]]:max-w-none",
            ),
      )}
    >
      {filter.control}
    </div>
  );
}

export function ToolbarOverflowField({ filter }: { filter: BuildToolbarFilter }) {
  return (
    <div
      data-slot="build-toolbar-drawer-field"
      className="flex w-full min-w-0 flex-col gap-1.5"
    >
      <span className="text-sm font-normal text-foreground">
        {filter.label}
      </span>
      <div className="w-full min-w-0 [&>*]:w-full [&>*]:max-w-none [&_[data-slot=select-trigger]]:w-full">
        {filter.control}
      </div>
    </div>
  );
}
