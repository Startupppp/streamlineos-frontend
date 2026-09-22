"use client";

import * as React from "react";
import { X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotificationCategory } from "@/types/notifications";
import { NOTIFICATION_CATEGORY_VALUES } from "@/types/notifications";
import { isNotificationCategory } from "./use-inbox-url-state";

const ALL_TYPES_SENTINEL = "__all__" as const;

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

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onQChange(localQ);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQ, onQChange]);

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
    if (isNotificationCategory(value)) {
      onTypeChange(value);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <SearchInput
        ref={searchInputRef}
        value={localQ}
        onValueChange={handleValueChange}
        placeholder="Search notifications…"
        fill
        inputClassName="h-8 text-xs"
      />
      <Select value={type ?? ALL_TYPES_SENTINEL} onValueChange={handleTypeSelectChange}>
        <SelectTrigger className="w-36 shrink-0" aria-label="Filter by category">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TYPES_SENTINEL}>All types</SelectItem>
          {NOTIFICATION_CATEGORY_VALUES.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {projectId !== null && onProjectClear && (
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/50 px-2 text-xs text-foreground hover:bg-muted"
          onClick={onProjectClear}
          aria-label={`Remove project filter (project ${projectId})`}
        >
          <span>Project #{projectId}</span>
          <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </button>
      )}
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
          <span>Clear filters</span>
        </Button>
      ) : null}
    </div>
  );
}
