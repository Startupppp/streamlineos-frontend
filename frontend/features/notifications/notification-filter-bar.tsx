"use client";

import { useCallback, useMemo } from "react";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SECTION_TABS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_PRIORITY_CONFIG,
  type NotificationSection,
  type NotificationCategory,
  type NotificationPriority,
} from "@/features/notifications/notification-types";
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

function FilterMenuItem({
  label,
  active,
  onSelect,
  badge,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  badge?: number;
}) {
  return (
    <DropdownMenuItem onClick={onSelect} className="text-xs">
      <span className={cn("flex h-3.5 w-3.5 items-center justify-center", !active && "opacity-0")}>
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </DropdownMenuItem>
  );
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
  const hasFilters = !!activeCategory || !!activePriority;
  const activeSectionLabel = SECTION_TABS.find((t) => t.value === activeSection)?.label ?? "All";

  const mobileFilterLabel = useMemo(() => {
    const parts: string[] = [activeSectionLabel];
    if (activeCategory) parts.push(NOTIFICATION_CATEGORY_CONFIG[activeCategory].label);
    if (activePriority) parts.push(NOTIFICATION_PRIORITY_CONFIG[activePriority].label);
    return parts.join(" · ");
  }, [activeSectionLabel, activeCategory, activePriority]);

  const handleSectionSelect = useCallback(
    (value: string) => onSectionChange(value as NotificationSection),
    [onSectionChange],
  );

  const handleCategorySelect = useCallback(
    (value: string) => onCategoryChange(value === "ALL" ? undefined : (value as NotificationCategory)),
    [onCategoryChange],
  );

  const handlePrioritySelect = useCallback(
    (value: string) => onPriorityChange(value === "ALL" ? undefined : (value as NotificationPriority)),
    [onPriorityChange],
  );

  const activeFilterCount =
    (activeSection !== "ALL" ? 1 : 0) + (activeCategory ? 1 : 0) + (activePriority ? 1 : 0);

  const filterControlClassName =
    "h-9 border-input bg-card text-xs font-normal";

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <SearchInput
        className="min-w-0 flex-1"
        value={search}
        onValueChange={onSearchChange}
        onClear={onClearSearch}
        placeholder="Search notifications…"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(filterControlClassName, "shrink-0 gap-1.5 sm:hidden max-w-[160px]")}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mobileFilterLabel}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">View</DropdownMenuLabel>
          {SECTION_TABS.map((tab) => (
            <FilterMenuItem
              key={tab.value}
              label={tab.label}
              active={activeSection === tab.value}
              onSelect={() => onSectionChange(tab.value)}
              badge={tab.value === "UNREAD" ? unreadCount : undefined}
            />
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Category</DropdownMenuLabel>
          <FilterMenuItem
            label="All Categories"
            active={!activeCategory}
            onSelect={() => onCategoryChange(undefined)}
          />
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <FilterMenuItem
              key={cat}
              label={NOTIFICATION_CATEGORY_CONFIG[cat].label}
              active={activeCategory === cat}
              onSelect={() => onCategoryChange(cat)}
            />
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Priority</DropdownMenuLabel>
          <FilterMenuItem
            label="All Priorities"
            active={!activePriority}
            onSelect={() => onPriorityChange(undefined)}
          />
          {NOTIFICATION_PRIORITIES.map((p) => (
            <FilterMenuItem
              key={p}
              label={NOTIFICATION_PRIORITY_CONFIG[p].label}
              active={activePriority === p}
              onSelect={() => onPriorityChange(p)}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Select value={activeSection} onValueChange={handleSectionSelect}>
        <SelectTrigger className={cn("hidden sm:flex w-[160px] shrink-0", filterControlClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SECTION_TABS.map((tab) => (
            <SelectItem key={tab.value} value={tab.value} className="text-xs">
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.value === "UNREAD" && unreadCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={activeCategory ?? "ALL"} onValueChange={handleCategorySelect}>
        <SelectTrigger className={cn("hidden sm:flex w-[140px] shrink-0", filterControlClassName)}>
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
        <SelectTrigger className={cn("hidden sm:flex w-[130px] shrink-0", filterControlClassName)}>
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
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex h-8 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:border-transparent focus-visible:ring-border focus-visible:ring-[3px] transition-colors"
          onClick={onClearFilters}
          aria-label="Clear filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
