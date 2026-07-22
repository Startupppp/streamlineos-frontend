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

export interface ProjectActiveFilters {
  status?: string;
  lead?: string;
  health?: string;
  startAfter?: string;
  startBefore?: string;
  endAfter?: string;
  endBefore?: string;
}

interface FilterOptionProps {
  label: string;
  active: boolean;
  onSelect: () => void;
}

const FILTER_CATEGORIES = [
  { key: "status", label: "Status" },
  { key: "lead", label: "Lead" },
  { key: "health", label: "Health" },
  { key: "startAfter", label: "Start date (after)" },
  { key: "endBefore", label: "Target date (before)" },
] as const;

type FilterKey = (typeof FILTER_CATEGORIES)[number]["key"];

const STATUS_OPTIONS = ["ACTIVE", "PLANNING", "COMPLETED", "ON_HOLD", "ARCHIVED"];
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "In Progress",
  PLANNING: "Planning",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  ARCHIVED: "Archived",
};

const HEALTH_OPTIONS = ["healthy", "at_risk", "critical"];
const HEALTH_LABELS: Record<string, string> = {
  healthy: "Healthy",
  at_risk: "At Risk",
  critical: "Critical",
};

function FilterOption({ label, active, onSelect }: FilterOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
    (value: string) => {
      onFiltersChange({ ...filters, status: filters.status === value ? undefined : value });
    },
    [filters, onFiltersChange],
  );

  const handleHealthSelect = useCallback(
    (value: string) => {
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
          className={cn(
            "h-8 gap-1.5 text-xs",
            hasAny && "border-primary/40 bg-primary/5 text-primary",
          )}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {hasAny ? (
            <Badge className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-[10px]">
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
          <p className="text-[13px] font-semibold text-foreground">Add filter</p>
          {hasAny ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <div className="w-28 shrink-0 space-y-0.5 border-r border-border pr-2">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategorySelect(cat.key)}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                  activeCategory === cat.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  filters[cat.key] && "font-medium text-foreground",
                )}
              >
                {cat.label}
                {filters[cat.key] ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            {activeCategory === "status" ? (
              <FilterSection title="Status">
                {STATUS_OPTIONS.map((s) => (
                  <FilterOption
                    key={s}
                    label={STATUS_LABELS[s] ?? s}
                    active={filters.status === s}
                    onSelect={() => handleStatusSelect(s)}
                  />
                ))}
              </FilterSection>
            ) : activeCategory === "health" ? (
              <FilterSection title="Health">
                {HEALTH_OPTIONS.map((h) => (
                  <FilterOption
                    key={h}
                    label={HEALTH_LABELS[h] ?? h}
                    active={filters.health === h}
                    onSelect={() => handleHealthSelect(h)}
                  />
                ))}
                <p className="mt-2 text-[10px] text-muted-foreground/70 italic">
                  Health score is a backend gap — not in current API response.
                </p>
              </FilterSection>
            ) : activeCategory === "lead" ? (
              <p className="text-[12px] text-muted-foreground py-2">
                Lead filter requires a user lookup endpoint — backend gap. Use the Status filter above or search by name.
              </p>
            ) : activeCategory === "startAfter" || activeCategory === "endBefore" ? (
              <p className="text-[12px] text-muted-foreground py-2">
                Date filters are a backend gap — the current /projects API does not accept date range params.
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground py-2">
                Select a filter category on the left.
              </p>
            )}
          </div>
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

interface ActiveFilterChipsProps {
  filters: ProjectActiveFilters;
  onRemove: (key: keyof ProjectActiveFilters) => void;
  leadName?: string;
}

const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: "Status: In Progress",
  PLANNING: "Status: Planning",
  COMPLETED: "Status: Completed",
  ON_HOLD: "Status: On Hold",
  ARCHIVED: "Status: Archived",
};

const HEALTH_LABEL_MAP: Record<string, string> = {
  healthy: "Health: Healthy",
  at_risk: "Health: At Risk",
  critical: "Health: Critical",
};

export function ActiveFilterChips({ filters, onRemove, leadName }: ActiveFilterChipsProps) {
  const chips: { key: keyof ProjectActiveFilters; label: string }[] = [];

  if (filters.status) {
    chips.push({ key: "status", label: STATUS_LABEL_MAP[filters.status] ?? `Status: ${filters.status}` });
  }
  if (filters.health) {
    chips.push({ key: "health", label: HEALTH_LABEL_MAP[filters.health] ?? `Health: ${filters.health}` });
  }
  if (filters.lead) {
    chips.push({ key: "lead", label: leadName ? `Lead: ${leadName}` : "Lead" });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="h-6 gap-1 pl-2 pr-1 text-[11px] font-normal"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label} filter`}
            onClick={() => onRemove(chip.key)}
            className="ml-0.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
