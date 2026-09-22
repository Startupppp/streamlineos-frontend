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

const ALL_TYPES_SENTINEL = "__all__" as const;

function isNotificationCategory(v: string): v is NotificationCategory {
  return (NOTIFICATION_CATEGORY_VALUES as readonly string[]).includes(v);
}

interface InboxFilterBarProps {
  q: string | null;
  type: NotificationCategory | null;
  hasActiveFilters: boolean;
  onQChange: (raw: string) => void;
  onTypeChange: (value: NotificationCategory | null) => void;
  onClearFilters: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function InboxFilterBar({
  q,
  type,
  hasActiveFilters,
  onQChange,
  onTypeChange,
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
