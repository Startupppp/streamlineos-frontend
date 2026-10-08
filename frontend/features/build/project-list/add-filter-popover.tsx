"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { Check, Filter, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { useBuildMembers, type BuildMember } from "@/hooks/api/build/build-members";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { ProjectHealth } from "@/types/projects/projects";

type ProjectStatusFilter = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface ProjectActiveFilters {
  status?: ProjectStatusFilter;
  lead?: string;
  health?: ProjectHealth;
  startAfter?: string;
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
  { key: "startAfter", label: "Start date" },
  { key: "endBefore", label: "Target date" },
] as const;

type FilterKey = (typeof FILTER_CATEGORIES)[number]["key"];

export const STATUS_OPTIONS: ProjectStatusFilter[] = ["ACTIVE", "COMPLETED", "ARCHIVED"];
export const STATUS_LABELS: Record<ProjectStatusFilter, string> = {
  ACTIVE: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const HEALTH_OPTIONS: ProjectHealth[] = ["on_track", "at_risk", "off_track"];
export const HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

function FilterOption<T extends string>({ value, label, active, onSelect }: FilterOptionProps<T>) {
  function handleClick() {
    onSelect(value);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center rounded-md px-2.5 py-2 text-left text-label transition-colors",
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
      )}
    >
      {label}
      {active ? <Check className="ml-auto size-3.5" aria-hidden="true" /> : null}
    </button>
  );
}

function FilterCategoryButton({ category, active, filled, onSelect }: {
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
      aria-pressed={active}
      className={cn(
        "flex min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="truncate">{category.label}</span>
      {filled ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
    </button>
  );
}

function LeadFilterOption({ member, active, onSelect }: {
  member: BuildMember;
  active: boolean;
  onSelect: (value: string) => void;
}) {
  const person = { name: member.name, email: member.email };
  const displayName = getUserDisplayName(person);

  function handleClick() {
    onSelect(member.id);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
        active ? "bg-primary/10 text-primary" : "hover:bg-muted",
      )}
    >
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={resolveImageUrl(member.image)} />
        <AvatarFallback className="text-micro">{getUserInitials(person)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-medium">{displayName}</span>
        <span className="block truncate text-micro text-muted-foreground">{member.email}</span>
      </span>
      {active ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}

function LeadFilterPanel({ activeLead, onSelect }: {
  activeLead: string | undefined;
  onSelect: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const canViewBuildMembers = useCan("build:members:view");
  const debouncedSearch = useDebouncedValue(search, 300).trim();
  const { data: buildMembers, isFetching } = useBuildMembers(
    {
      limit: 100,
      status: "active",
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    },
    { enabled: canViewBuildMembers },
  );
  const members = buildMembers?.data ?? [];

  return (
    <div className="space-y-2">
      <SearchInput value={search} onValueChange={setSearch} placeholder="Search Build members…" aria-label="Search Build members" />
      <div className="max-h-52 space-y-1 overflow-y-auto">
        {!canViewBuildMembers ? (
          <p className="py-4 text-center text-xs text-muted-foreground">You do not have access to the Build member directory.</p>
        ) : isFetching ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading Build members…</p>
        ) : members.length ? members.map((member) => (
          <LeadFilterOption
            key={member.id}
            member={member}
            active={activeLead === member.id}
            onSelect={onSelect}
          />
        )) : <p className="py-4 text-center text-xs text-muted-foreground">No Build members found.</p>}
      </div>
    </div>
  );
}

interface AddFilterPopoverProps {
  filters: ProjectActiveFilters;
  onFiltersChange: (next: ProjectActiveFilters) => void;
}

export function AddFilterPopover({ filters, onFiltersChange }: AddFilterPopoverProps) {
  const [activeCategory, setActiveCategory] = useState<FilterKey>("status");
  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleCategorySelect = useCallback((key: FilterKey) => setActiveCategory(key), []);
  const handleStatusSelect = useCallback((value: ProjectStatusFilter) => {
    onFiltersChange({ ...filters, status: filters.status === value ? undefined : value });
  }, [filters, onFiltersChange]);
  const handleHealthSelect = useCallback((value: ProjectHealth) => {
    onFiltersChange({ ...filters, health: filters.health === value ? undefined : value });
  }, [filters, onFiltersChange]);
  const handleLeadSelect = useCallback((value: string) => {
    onFiltersChange({ ...filters, lead: filters.lead === value ? undefined : value });
  }, [filters, onFiltersChange]);
  const handleStartAfterChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, startAfter: event.target.value || undefined });
  }, [filters, onFiltersChange]);
  const handleEndBeforeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, endBefore: event.target.value || undefined });
  }, [filters, onFiltersChange]);
  const handleClearAll = useCallback(() => {
    onFiltersChange({});
    setActiveCategory("status");
  }, [onFiltersChange]);

  const hasAny = activeCount > 0;

  return (
    <ResponsivePopover>
      <MobileOnlyLabelTooltip label="Filters">
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Filters"
            className={cn(
              RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
              hasAny && "border-primary/40 bg-primary/5 text-primary",
            )}
          >
            <Filter className="size-3.5 shrink-0" aria-hidden="true" />
            <ResponsiveIconLabelText>Filters</ResponsiveIconLabelText>
            {hasAny ? <Badge className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-micro">{activeCount}</Badge> : null}
          </Button>
        </ResponsivePopoverTrigger>
      </MobileOnlyLabelTooltip>
      <ResponsivePopoverContent align="start" title="Project filters" className="w-[min(22rem,calc(100vw-2rem))] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-label font-medium text-foreground">Filter projects</p>
            <p className="text-micro text-muted-foreground">Choose a field, then select its value.</p>
          </div>
          {hasAny ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
              <X className="size-3.5" aria-hidden="true" />
              Clear
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-1 border-b border-border pb-3">
          {FILTER_CATEGORIES.map((category) => (
            <FilterCategoryButton
              key={category.key}
              category={category}
              active={activeCategory === category.key}
              filled={Boolean(filters[category.key])}
              onSelect={handleCategorySelect}
            />
          ))}
        </div>

        <div className="pt-3">
          {activeCategory === "status" ? (
            <div className="space-y-1" aria-label="Status options">
              {STATUS_OPTIONS.map((status) => (
                <FilterOption key={status} value={status} label={STATUS_LABELS[status]} active={filters.status === status} onSelect={handleStatusSelect} />
              ))}
            </div>
          ) : activeCategory === "health" ? (
            <div className="space-y-1" aria-label="Health options">
              {HEALTH_OPTIONS.map((health) => (
                <FilterOption key={health} value={health} label={HEALTH_LABELS[health]} active={filters.health === health} onSelect={handleHealthSelect} />
              ))}
            </div>
          ) : activeCategory === "lead" ? (
            <LeadFilterPanel activeLead={filters.lead} onSelect={handleLeadSelect} />
          ) : activeCategory === "startAfter" ? (
            <div className="space-y-2">
              <label htmlFor="project-start-after" className="text-label font-medium">Starts on or after</label>
              <Input id="project-start-after" type="date" value={filters.startAfter ?? ""} onChange={handleStartAfterChange} />
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="project-end-before" className="text-label font-medium">Target is on or before</label>
              <Input id="project-end-before" type="date" value={filters.endBefore ?? ""} onChange={handleEndBeforeChange} />
            </div>
          )}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
