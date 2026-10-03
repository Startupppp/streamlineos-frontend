"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import type { NotificationCategory } from "@/types/notifications";
import { BUILD_INBOX_CATEGORIES, isBuildInboxCategory } from "./inbox-categories";

const ALL_TYPES_SENTINEL = "__all__" as const;
const TYPE_OPTIONS = [
  { value: ALL_TYPES_SENTINEL, label: "All types" },
  ...BUILD_INBOX_CATEGORIES,
] as const;

interface InboxFilterBarProps {
  q: string | null;
  type: NotificationCategory | null;
  projectId?: number | null;
  hasActiveFilters: boolean;
  onQChange: (raw: string) => void;
  onTypeChange: (value: NotificationCategory | null) => void;
  onProjectClear?: () => void;
  onClearFilters: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function InboxFilterBar({
  q,
  type,
  projectId = null,
  hasActiveFilters,
  onQChange,
  onTypeChange,
  onProjectClear,
  onClearFilters,
  searchInputRef,
}: InboxFilterBarProps) {
  const [localQ, setLocalQ] = React.useState(q ?? "");

  React.useEffect(() => {
    setLocalQ(q ?? "");
  }, [q]);

  const onQChangeRef = React.useRef(onQChange);
  React.useLayoutEffect(() => {
    onQChangeRef.current = onQChange;
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onQChangeRef.current(localQ);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQ]);

  function handleValueChange(value: string) {
    setLocalQ(value);
  }

  function handleClearFilters() {
    onClearFilters();
  }

  function handleTypeSelectChange(value: string) {
    if (value === ALL_TYPES_SENTINEL) {
      onTypeChange(null);
      return;
    }
    if (isBuildInboxCategory(value)) {
      onTypeChange(value);
    }
  }

  return (
    <BuildListToolbar
      className="shrink-0 border-b border-border px-3 py-2"
      search={{
        value: localQ,
        onValueChange: handleValueChange,
        placeholder: "Search notifications…",
        label: "Search notifications",
        inputRef: searchInputRef,
      }}
      filters={[
        {
          id: "type",
          label: "Category",
          active: type !== null,
          control: (
            <BuildFilterSelect
              label="Filter by category"
              value={type ?? ALL_TYPES_SENTINEL}
              onValueChange={handleTypeSelectChange}
              options={TYPE_OPTIONS}
              className="md:min-w-36"
            />
          ),
        },
      ]}
      trailing={
        <>
          {projectId !== null && onProjectClear ? (
            <button
              type="button"
              className="inline-flex h-8 max-w-36 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/50 px-2 text-xs text-foreground hover:bg-muted"
              onClick={onProjectClear}
              aria-label={`Remove project filter (project ${projectId})`}
            >
              <span className="truncate">Project #{projectId}</span>
              <X className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          ) : null}
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
              onClick={handleClearFilters}
              aria-label="Clear filters"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Clear filters</span>
            </Button>
          ) : null}
        </>
      }
      onClearAll={handleClearFilters}
    />
  );
}
