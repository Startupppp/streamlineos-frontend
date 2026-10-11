import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BuildInlineFilter {
  id: string;
  control: ReactNode;
}

export function BuildInlineFilters({
  filters,
  className,
}: {
  filters: readonly BuildInlineFilter[];
  className?: string;
}) {
  if (filters.length === 0) return null;

  return (
    <div
      data-slot="build-inline-filters"
      className={cn(
        "grid w-full min-w-0 grid-cols-2 gap-2 md:flex md:flex-nowrap md:items-center",
        className,
      )}
    >
      {filters.map((filter) => (
        <div
          key={filter.id}
          data-filter-id={filter.id}
          className="min-w-0 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:min-w-0 [&_[data-slot=select-trigger]]:max-w-none md:max-w-40 md:flex-1 md:basis-0"
        >
          {filter.control}
        </div>
      ))}
    </div>
  );
}
