"use client";

import { useCallback, useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectHealth } from "@/types/projects/projects";

export type ProjectStatusFilter = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface ProjectActiveFilters {
  status?: ProjectStatusFilter;
  lead?: string;
  health?: ProjectHealth;
  startAfter?: string;
  startBefore?: string;
  endAfter?: string;
  endBefore?: string;
}

interface FilterOptionProps<T extends string> {
  value: T;
  label: string;
  active: boolean;
  onSelect: (value: T) => void;
}

const FILTER_CATEGORIES = [
  { key: "status", label: "Status" },
  { key: "lead", label: "Lead" },
  { key: "health", label: "Health" },
  { key: "startAfter", label: "Start date (after)" },
  { key: "endBefore", label: "Target date (before)" },
] as const;

type FilterKey = (typeof FILTER_CATEGORIES)[number]["key"];

export const STATUS_OPTIONS: ProjectStatusFilter[] = ["ACTIVE", "COMPLETED", "ARCHIVED"];
export const STATUS_LABELS: Record<ProjectStatusFilter, string> = {
  ACTIVE: "In Progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const HEALTH_OPTIONS: ProjectHealth[] = ["on_track", "at_risk", "off_track"];
export const HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
};

function FilterOption<T extends string>({ value, label, active, onSelect }: FilterOptionProps<T>) {
  function handleClick() {
    onSelect(value);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center rounded-md px-2 py-1.5 text-left text-label transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function FilterCategoryButton({
  category,
  active,
  filled,
  onSelect,
}: {
  category: (typeof FILTER_CATEGORIES)[number];
  active: boolean;
  filled: boolean;
  onSelect: (key: FilterKey) => void;
}) {
  function handleClick() {
    onSelect(category.key);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        filled && "font-medium text-foreground",
      )}
    >
      {category.label}
      {filled ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /> : null}
    </button>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface AddFilterPopoverProps {
  filters: ProjectActiveFilters;
  onFiltersChange: (next: ProjectActiveFilters) => void;
}

export function AddFilterPopover({ filters, onFiltersChange }: AddFilterPopoverProps) {
  const [activeCategory, setActiveCategory] = useState<FilterKey | null>(null);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleCategorySelect = useCallback((key: FilterKey) => {
    setActiveCategory((prev) => (prev === key ? null : key));
  }, []);

  const handleStatusSelect = useCallback(
    (value: ProjectStatusFilter) => {
      onFiltersChange({ ...filters, status: filters.status === value ? undefined : value });
    },
    [filters, onFiltersChange],
  );

  const handleHealthSelect = useCallback(
    (value: ProjectHealth) => {
      onFiltersChange({ ...filters, health: filters.health === value ? undefined : value });
    },
    [filters, onFiltersChange],
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange({});
    setActiveCategory(null);
  }, [onFiltersChange]);

  const hasAny = activeCount > 0;

  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Filters"
          className={cn(
            "h-9 gap-1.5 text-xs",
            hasAny && "border-primary/40 bg-primary/5 text-primary",
          )}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Filters</span>
          {hasAny ? (
            <Badge className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-micro">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="start"
        title="Add filter"
        className="w-72 p-3"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-label font-semibold text-foreground">Add filter</p>
          {hasAny ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-0.5 text-dense text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <div className="w-28 shrink-0 space-y-0.5 border-r border-border pr-2">
            {FILTER_CATEGORIES.map((cat) => (
              <FilterCategoryButton
                key={cat.key}
                category={cat}
                active={activeCategory === cat.key}
                filled={Boolean(filters[cat.key])}
                onSelect={handleCategorySelect}
              />
            ))}
          </div>

          <div className="min-w-0 flex-1">
            {activeCategory === "status" ? (
              <FilterSection title="Status">
                {STATUS_OPTIONS.map((s) => (
                  <FilterOption
                    key={s}
                    value={s}
                    label={STATUS_LABELS[s] ?? s}
                    active={filters.status === s}
                    onSelect={handleStatusSelect}
                  />
                ))}
              </FilterSection>
            ) : activeCategory === "health" ? (
              <FilterSection title="Health">
                {HEALTH_OPTIONS.map((h) => (
                  <FilterOption
                    key={h}
                    value={h}
                    label={HEALTH_LABELS[h] ?? h}
                    active={filters.health === h}
                    onSelect={handleHealthSelect}
                  />
                ))}
              </FilterSection>
            ) : activeCategory === "lead" ? (
              <p className="text-xs text-muted-foreground py-2">
                Lead filter requires a user lookup endpoint — backend gap. Use the Status filter above or search by name.
              </p>
            ) : activeCategory === "startAfter" || activeCategory === "endBefore" ? (
              <p className="text-xs text-muted-foreground py-2">
                Date filters are a backend gap — the current /projects API does not accept date range params.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Select a filter category on the left.
              </p>
            )}
          </div>
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
