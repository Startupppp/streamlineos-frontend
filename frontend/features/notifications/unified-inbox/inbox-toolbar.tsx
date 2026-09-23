"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
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
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
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
  onUnreadOnlyChange,
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

  const handleUnreadToggle = useCallback(
    () => onUnreadOnlyChange(!state.unreadOnly),
    [onUnreadOnlyChange, state.unreadOnly],
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

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <ViewToggle<InboxView>
          value={state.view}
          options={VIEWS}
          onChange={onViewChange}
          showLabel
        />
        <Link
          href="/settings/notifications/my-preferences"
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          Notification settings
        </Link>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput
          value={rawSearch}
          onValueChange={handleSearchValueChange}
          placeholder="Search inbox…"
          className="flex-1 min-w-[10rem] max-w-sm"
        />
        <Button
          type="button"
          variant={state.unreadOnly ? "default" : "outline"}
          size="sm"
          onClick={handleUnreadToggle}
          aria-pressed={state.unreadOnly}
        >
          Unread only
        </Button>
        <Select
          value={state.category || "__all__"}
          onValueChange={handleCategoryValueChange}
        >
          <SelectTrigger className="w-36 h-9 text-sm" aria-label="Filter by category">
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
          <SelectTrigger className="w-28 h-9 text-sm" aria-label="Filter by priority">
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
          <SelectTrigger className="w-36 h-9 text-sm" aria-label="Filter by source">
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
          <Select
            value={state.module || "__all__"}
            onValueChange={handleModuleValueChange}
          >
            <SelectTrigger className="w-36 h-9 text-sm" aria-label="Filter by module">
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
          className="w-44 h-9 text-sm"
        />
        <Select value={state.group} onValueChange={handleGroupValueChange}>
          <SelectTrigger className="w-36 h-9 text-sm" aria-label="Group by">
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
        <InboxSavedViewsPanel
          currentState={state}
          onApply={onApplySavedView}
        />
      </div>
    </div>
  );
}
