"use client";

import { useCallback, useMemo, useState } from "react";
import { useShellVariant } from "@/components/layout/shell-variant-context";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  FilterMenuItem,
  FilterSectionLabel,
  FilterSectionDivider,
  ClearFiltersButton,
} from "./notification-filter-bar-parts";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  SECTION_TABS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG,
  type NotificationSection,
  type NotificationCategory,
  type NotificationPriority,
} from "@/lib/notification-types";
import { cn } from "@/lib/utils";

interface NotificationFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  activeSection: NotificationSection;
  onSectionChange: (section: NotificationSection) => void;
  activeCategory: NotificationCategory | undefined;
  onCategoryChange: (category: NotificationCategory | undefined) => void;
  activePriority: NotificationPriority | undefined;
  onPriorityChange: (priority: NotificationPriority | undefined) => void;
  onClearFilters: () => void;
  unreadCount: number;
}

export function NotificationFilterBar({
  search,
  onSearchChange,
  onClearSearch,
  activeSection,
  onSectionChange,
  activeCategory,
  onCategoryChange,
  activePriority,
  onPriorityChange,
  onClearFilters,
  unreadCount,
}: NotificationFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const shellVariant = useShellVariant();
  const hasFilters = !!activeCategory || !!activePriority;
  const activeSectionLabel = SECTION_TABS.find((t) => t.value === activeSection)?.label ?? "All";

  const mobileFilterLabel = useMemo(() => {
    const parts: string[] = [activeSectionLabel];
    if (activeCategory) parts.push(NOTIFICATION_CATEGORY_CONFIG[activeCategory].label);
    if (activePriority) parts.push(NOTIFICATION_PRIORITY_CONFIG[activePriority].label);
    return parts.join(" · ");
  }, [activeSectionLabel, activeCategory, activePriority]);

  const handleSectionSelect = useCallback(
    (value: string) => {
      const next = SECTION_TABS.find((tab) => tab.value === value);
      if (next) onSectionChange(next.value);
    },
    [onSectionChange],
  );

  const handleCategorySelect = useCallback(
    (value: string) =>
      onCategoryChange(value === "ALL" ? undefined : NOTIFICATION_CATEGORIES.find((c) => c === value)),
    [onCategoryChange],
  );

  const handlePrioritySelect = useCallback(
    (value: string) =>
      onPriorityChange(value === "ALL" ? undefined : NOTIFICATION_PRIORITIES.find((p) => p === value)),
    [onPriorityChange],
  );

  const handleMobileSectionSelect = useCallback(
    (section: NotificationSection) => {
      onSectionChange(section);
      setFilterOpen(false);
    },
    [onSectionChange],
  );

  const handleMobileCategorySelect = useCallback(
    (category: NotificationCategory | undefined) => {
      onCategoryChange(category);
      setFilterOpen(false);
    },
    [onCategoryChange],
  );

  const handleMobilePrioritySelect = useCallback(
    (priority: NotificationPriority | undefined) => {
      onPriorityChange(priority);
      setFilterOpen(false);
    },
    [onPriorityChange],
  );

  const activeFilterCount =
    (activeSection !== "ALL" ? 1 : 0) + (activeCategory ? 1 : 0) + (activePriority ? 1 : 0);

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <SearchInput
        className="min-w-0 flex-1"
        value={search}
        onValueChange={onSearchChange}
        onClear={onClearSearch}
        placeholder="Search notifications…"
      />

      <ResponsivePopover open={filterOpen} onOpenChange={setFilterOpen}>
        <ResponsivePopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(FILTER_SELECT_TRIGGER, "shrink-0 h-9 gap-1.5 sm:hidden max-w-[160px]")}
            aria-label="Filter notifications"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mobileFilterLabel}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-micro font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          align="end"
          title="Filters"
          className="w-56 p-1"
        >
          <div role="menu" aria-label="Notification filters">
            <FilterSectionLabel>View</FilterSectionLabel>
            {SECTION_TABS.map((tab) => (
              <FilterMenuItem
                key={tab.value}
                label={tab.label}
                active={activeSection === tab.value}
                onSelect={() => handleMobileSectionSelect(tab.value)}
                badge={tab.value === "UNREAD" ? unreadCount : undefined}
              />
            ))}
            <FilterSectionDivider />
            <FilterSectionLabel>Category</FilterSectionLabel>
            <FilterMenuItem
              label="All Categories"
              active={!activeCategory}
              onSelect={() => handleMobileCategorySelect(undefined)}
            />
            {NOTIFICATION_CATEGORIES.map((cat) => (
              <FilterMenuItem
                key={cat}
                label={NOTIFICATION_CATEGORY_CONFIG[cat].label}
                active={activeCategory === cat}
                onSelect={() => handleMobileCategorySelect(cat)}
              />
            ))}
            <FilterSectionDivider />
            <FilterSectionLabel>Priority</FilterSectionLabel>
            <FilterMenuItem
              label="All Priorities"
              active={!activePriority}
              onSelect={() => handleMobilePrioritySelect(undefined)}
            />
            {NOTIFICATION_PRIORITIES.map((p) => (
              <FilterMenuItem
                key={p}
                label={NOTIFICATION_PRIORITY_CONFIG[p].label}
                active={activePriority === p}
                onSelect={() => handleMobilePrioritySelect(p)}
              />
            ))}
          </div>
        </ResponsivePopoverContent>
      </ResponsivePopover>

      {shellVariant === "desktop" && (
        <>
          <Select value={activeSection} onValueChange={handleSectionSelect}>
            <SelectTrigger
              aria-label="Notification section"
              className={cn("hidden sm:flex w-[160px] shrink-0", FILTER_SELECT_TRIGGER)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTION_TABS.map((tab) => (
                <SelectItem key={tab.value} value={tab.value} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    {tab.value === "UNREAD" && unreadCount > 0 && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeCategory ?? "ALL"} onValueChange={handleCategorySelect}>
            <SelectTrigger className={cn("hidden sm:flex w-[140px] shrink-0", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {NOTIFICATION_CATEGORY_CONFIG[cat].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activePriority ?? "ALL"} onValueChange={handlePrioritySelect}>
            <SelectTrigger className={cn("hidden sm:flex w-[130px] shrink-0", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Priorities</SelectItem>
              {NOTIFICATION_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {NOTIFICATION_PRIORITY_CONFIG[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <ClearFiltersButton onClick={onClearFilters} />
          )}
        </>
      )}
    </div>
  );
}
