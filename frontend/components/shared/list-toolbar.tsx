"use client";

import type { ReactNode } from "react";
import { SearchInput } from "@/components/ui/search-input";
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
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {onSearchChange !== undefined ? (
          <div className="min-w-[200px] max-w-md flex-1">
            <SearchInput
              value={search ?? ""}
              onValueChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        ) : null}
        {filters ? (
          <div className="flex flex-wrap items-center gap-2">{filters}</div>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
