"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Settings2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { ViewToggle } from "@/components/ui/view-toggle";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOTIFICATION_CATEGORY_VALUES } from "@/types/notifications";
import type { InboxKind } from "@/types/inbox";
import {
  VIEWS,
  type InboxView,
  type InboxFilterState,
  type InboxGrouping,
} from "./inbox-view-params";
import { GROUPING_OPTIONS } from "./inbox-grouping";
import { INBOX_SOURCE_LABELS } from "./inbox-sources";
import { InboxSavedViewsPanel } from "./inbox-saved-views-panel";

const ALL_KINDS: InboxKind[] = [
  "notification",
  "broadcast",
  "mail",
  "build_approval",
];

const VALID_KIND_SET: ReadonlySet<string> = new Set<InboxKind>(ALL_KINDS);

function parseKind(value: string): InboxKind | null {
  return VALID_KIND_SET.has(value) ? (ALL_KINDS.find((k) => k === value) ?? null) : null;
}
const SEARCH_DEBOUNCE_MS = 300;

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

function formatModuleLabel(mod: string): string {
  return mod
    .split(/[_-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export interface InboxToolbarProps {
  state: InboxFilterState;
  availableModules: string[];
  onViewChange: (view: InboxView) => void;
  onSearchChange: (q: string) => void;
  onCategoryChange: (category: string) => void;
  onPriorityChange: (priority: string) => void;
  onKindOverrideChange: (kinds: InboxKind[]) => void;
  onGroupChange: (group: InboxGrouping) => void;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  onModuleChange: (module: string) => void;
  onApplySavedView: (next: InboxFilterState) => void;
}

export function InboxToolbar({
  state,
  availableModules,
  onViewChange,
  onSearchChange,
  onCategoryChange,
  onPriorityChange,
  onKindOverrideChange,
  onGroupChange,
  onFromChange,
  onToChange,
  onModuleChange,
  onApplySavedView,
}: InboxToolbarProps) {
  const [rawSearch, setRawSearch] = useState(state.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRawSearch(state.q);
  }, [state.q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchValueChange = useCallback(
    (value: string) => {
      setRawSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange(value);
      }, SEARCH_DEBOUNCE_MS);
    },
    [onSearchChange],
  );

  const handleCategoryValueChange = useCallback(
    (value: string) => onCategoryChange(value === "__all__" ? "" : value),
    [onCategoryChange],
  );

  const handlePriorityValueChange = useCallback(
    (value: string) => onPriorityChange(value === "__all__" ? "" : value),
    [onPriorityChange],
  );

  const handleKindValueChange = useCallback(
    (value: string) => {
      if (value === "__all__") {
        onKindOverrideChange([]);
        return;
      }
      const kind = parseKind(value);
      if (kind !== null) onKindOverrideChange([kind]);
    },
    [onKindOverrideChange],
  );

  const handleGroupValueChange = useCallback(
    (value: string) => onGroupChange(value as InboxGrouping),
    [onGroupChange],
  );

  const handleModuleValueChange = useCallback(
    (value: string) => onModuleChange(value === "__all__" ? "" : value),
    [onModuleChange],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      onFromChange(range.from);
      onToChange(range.to);
    },
    [onFromChange, onToChange],
  );

  const kindSelectValue =
    state.kindOverride.length === 1 ? state.kindOverride[0] : "__all__";

  const activeFilterCount = [
    state.category,
    state.priority,
    state.kindOverride.length > 0 ? "source" : "",
    state.module,
    state.from || state.to,
    state.group !== "none" ? state.group : "",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ViewToggle<InboxView>
            value={state.view}
            options={VIEWS}
            onChange={onViewChange}
            showLabel={false}
            className="flex w-max min-w-full md:hidden"
          />
          <ViewToggle<InboxView>
            value={state.view}
            options={VIEWS}
            onChange={onViewChange}
            showLabel
            className="hidden max-w-full overflow-x-auto md:flex"
          />
        </div>
        <Button
          asChild
          variant="default"
          size="sm"
          className="ml-auto size-9 shrink-0 px-0 xl:h-9 xl:w-auto xl:gap-1.5 xl:px-3"
        >
          <Link
            href="/settings/notifications/my-preferences"
            aria-label="Notification settings"
            title="Notification settings"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden xl:inline">Notification settings</span>
          </Link>
        </Button>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <SearchInput
          value={rawSearch}
          onValueChange={handleSearchValueChange}
          placeholder="Search inbox…"
          className="min-w-0 flex-1 md:max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={activeFilterCount > 0 ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-1.5"
              aria-label="Open inbox filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 ? ` ${activeFilterCount}` : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-3">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={state.category || "__all__"}
                onValueChange={handleCategoryValueChange}
              >
                <SelectTrigger className="h-9 w-full text-sm" aria-label="Filter by category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {NOTIFICATION_CATEGORY_VALUES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={state.priority || "__all__"}
                onValueChange={handlePriorityValueChange}
              >
                <SelectTrigger className="h-9 w-full text-sm" aria-label="Filter by priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={kindSelectValue} onValueChange={handleKindValueChange}>
                <SelectTrigger className="h-9 w-full text-sm" aria-label="Filter by source">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All sources</SelectItem>
                  {ALL_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {INBOX_SOURCE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableModules.length > 0 && (
                <Select value={state.module || "__all__"} onValueChange={handleModuleValueChange}>
                  <SelectTrigger className="h-9 w-full text-sm" aria-label="Filter by module">
                    <SelectValue placeholder="Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All modules</SelectItem>
                    {availableModules.map((mod) => (
                      <SelectItem key={mod} value={mod}>
                        {formatModuleLabel(mod)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <DateRangePicker
                from={state.from || undefined}
                to={state.to || undefined}
                onChange={handleDateRangeChange}
                placeholder="Date range"
                className="col-span-2 h-9 w-full text-sm"
              />
              <Select value={state.group} onValueChange={handleGroupValueChange}>
                <SelectTrigger className="col-span-2 h-9 w-full text-sm" aria-label="Group by">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  {GROUPING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <InboxSavedViewsPanel currentState={state} onApply={onApplySavedView} />
      </div>
    </div>
  );
}
