"use client";

import * as React from "react";
import { X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";

interface InboxFilterBarProps {
  q: string | null;
  type: string | null;
  hasActiveFilters: boolean;
  onQChange: (raw: string) => void;
  onTypeChange: (value: string | null) => void;
  onClearFilters: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function InboxFilterBar({
  q,
  type: _type,
  hasActiveFilters,
  onQChange,
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
