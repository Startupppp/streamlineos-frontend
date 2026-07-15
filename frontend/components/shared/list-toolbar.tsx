"use client";

import type { ReactNode } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

interface ListToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  className,
}: ListToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className={cn(FILTER_TOOLBAR_ROW, "flex-1")}>
        {onSearchChange !== undefined ? (
          <div className="min-w-[200px] max-w-md">
            <SearchInput
              value={search ?? ""}
              onValueChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        ) : null}
        {filters ? (
          <div className={FILTER_TOOLBAR_ROW}>{filters}</div>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
