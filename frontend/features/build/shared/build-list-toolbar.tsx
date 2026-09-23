"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import {
  BUILD_TOOLBAR_CLEAR_LABEL,
  BUILD_TOOLBAR_DRAWER_DESCRIPTION,
  BUILD_TOOLBAR_FILTERS_LABEL,
  BUILD_TOOLBAR_ROOT_CLASS,
  BUILD_TOOLBAR_TRAILING_CLASS,
  buildToolbarLayout,
  type BuildToolbarFilter,
  type BuildToolbarSearch,
} from "./build-list-toolbar-layout";

interface BuildListToolbarProps {
  search?: BuildToolbarSearch;
  filters?: readonly BuildToolbarFilter[];
  trailing?: ReactNode;
  trailingLabel?: string;
  onClearAll?: () => void;
  drawerTitle?: string;
  className?: string;
}

function ToolbarFilterSlot({
  filter,
  collapsed,
}: {
  filter: BuildToolbarFilter;
  collapsed: boolean;
}) {
  return (
    <div
      data-slot="build-toolbar-filter"
      data-filter-id={filter.id}
      className={cn(
        "min-w-0 md:w-auto md:shrink-0 md:flex-none md:basis-auto",
        collapsed ? "max-md:hidden" : "max-md:w-full",
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
  trailingLabel = "Display",
  onClearAll,
  drawerTitle = BUILD_TOOLBAR_FILTERS_LABEL,
  className,
}: BuildListToolbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerBodyRef = useRef<HTMLDivElement>(null);
  const layout = buildToolbarLayout({ search, filters, trailing: Boolean(trailing) });

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

  const showClear = Boolean(onClearAll) && layout.anyActive;

  return (
    <div
      data-slot="build-list-toolbar"
      className={cn(BUILD_TOOLBAR_ROOT_CLASS, layout.mobileColumns, className)}
    >
      {search ? (
        <SearchInput
          fill
          value={search.value}
          onValueChange={search.onValueChange}
          placeholder={search.placeholder}
          aria-label={search.label ?? search.placeholder}
          className="min-w-0 md:min-w-[12rem] md:max-w-xs md:flex-1 md:basis-[12rem] lg:max-w-sm"
        />
      ) : null}

      {layout.filters.map((entry) => (
        <ToolbarFilterSlot
          key={entry.filter.id}
          filter={entry.filter}
          collapsed={entry.collapsed}
        />
      ))}

      {layout.collapse ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full min-w-0 justify-center gap-1.5 md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{BUILD_TOOLBAR_FILTERS_LABEL}</span>
              {layout.collapsedActiveCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-dense font-medium tabular-nums text-foreground">
                  {layout.collapsedActiveCount}
                </span>
              ) : null}
            </Button>
          </DrawerTrigger>
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
              {layout.filters
                .filter((entry) => entry.collapsed)
                .map((entry) => (
                  <ToolbarDrawerField key={entry.filter.id} filter={entry.filter} />
                ))}
              {trailing ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    {trailingLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">{trailing}</div>
                </div>
              ) : null}
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

      {trailing || showClear ? (
        <div
          className={cn(
            BUILD_TOOLBAR_TRAILING_CLASS,
            layout.collapse && "max-md:hidden",
          )}
        >
          {trailing}
          {showClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={handleClearAll}
            >
              {BUILD_TOOLBAR_CLEAR_LABEL}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
