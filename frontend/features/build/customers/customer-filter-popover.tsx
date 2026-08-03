"use client";

import { useCallback, useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import type { OrgSize } from "@/types/crm";

export interface CustomerFilters {
  industry?: string;
  size?: OrgSize;
}

const FILTER_CATEGORIES = [
  { key: "industry" as const, label: "Industry" },
  { key: "size" as const, label: "Size" },
] as const;

type FilterKey = (typeof FILTER_CATEGORIES)[number]["key"];

const SIZE_OPTIONS: OrgSize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Education",
  "Media",
  "Consulting",
  "Real Estate",
  "Transportation",
];

interface FilterOptionProps {
  label: string;
  active: boolean;
  onSelect: () => void;
}

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

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface CustomerFilterPopoverProps {
  filters: CustomerFilters;
  onFiltersChange: (next: CustomerFilters) => void;
}

export function CustomerFilterPopover({
  filters,
  onFiltersChange,
}: CustomerFilterPopoverProps) {
  const [activeCategory, setActiveCategory] = useState<FilterKey | null>(null);

  const activeCount = Object.values(filters).filter(Boolean).length;
  const hasAny = activeCount > 0;

  const handleCategorySelect = useCallback((key: FilterKey) => {
    setActiveCategory((prev) => (prev === key ? null : key));
  }, []);

  const handleIndustrySelect = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        industry: filters.industry === value ? undefined : value,
      });
    },
    [filters, onFiltersChange],
  );

  const handleSizeSelect = useCallback(
    (value: OrgSize) => {
      onFiltersChange({
        ...filters,
        size: filters.size === value ? undefined : value,
      });
    },
    [filters, onFiltersChange],
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange({});
    setActiveCategory(null);
  }, [onFiltersChange]);

  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-xs",
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
          <p className="text-[13px] font-semibold text-foreground">
            Add filter
          </p>
          {hasAny ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
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
            {activeCategory === "industry" ? (
              <FilterSection title="Industry">
                {INDUSTRY_OPTIONS.map((ind) => (
                  <FilterOption
                    key={ind}
                    label={ind}
                    active={filters.industry === ind}
                    onSelect={() => handleIndustrySelect(ind)}
                  />
                ))}
              </FilterSection>
            ) : activeCategory === "size" ? (
              <FilterSection title="Size">
                {SIZE_OPTIONS.map((s) => (
                  <FilterOption
                    key={s}
                    label={s}
                    active={filters.size === s}
                    onSelect={() => handleSizeSelect(s)}
                  />
                ))}
              </FilterSection>
            ) : (
              <p className="py-2 text-[12px] text-muted-foreground">
                Select a filter category on the left.
              </p>
            )}
          </div>
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

interface ActiveCustomerFilterChipsProps {
  filters: CustomerFilters;
  onRemove: (key: keyof CustomerFilters) => void;
}

export function ActiveCustomerFilterChips({
  filters,
  onRemove,
}: ActiveCustomerFilterChipsProps) {
  const chips: { key: keyof CustomerFilters; label: string }[] = [];

  if (filters.industry) {
    chips.push({ key: "industry", label: `Industry: ${filters.industry}` });
  }
  if (filters.size) {
    chips.push({ key: "size", label: `Size: ${filters.size}` });
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
