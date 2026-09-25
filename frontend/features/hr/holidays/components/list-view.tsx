"use client";

import { useState, useMemo } from "react";
import { getYear, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import type { Holiday } from "@/hooks/api/hr/holidays";
import { HolidayItem } from "./holiday-item";

interface ListViewProps {
  holidays: Holiday[];
  canManage: boolean;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  yearFilter: number | "all";
}

export function ListView({ holidays, canManage, onEdit, onDelete, onAdd, yearFilter }: ListViewProps) {
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let items = holidays;
    if (yearFilter !== "all") {
      items = items.filter((h) => getYear(parseISO(h.date)) === yearFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((h) => h.name.toLowerCase().includes(q));
    }
    return [...items].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [holidays, yearFilter, search, sortDir]);

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleClearSearch() {
    setSearch("");
  }

  function handleSortToggle() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <SearchInput
          placeholder="Search holidays..."
          value={search}
          onValueChange={handleSearchChange}
        />
        <Button variant="outline" size="sm" onClick={handleSortToggle} aria-label={`Sort by date, ${sortDir === "asc" ? "oldest" : "newest"} first`}>
          Date {sortDir === "asc" ? "↑" : "↓"}
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          illustrationPreset="calendar"
          illustrationSize="md"
          title="No holidays for this period"
          description={search ? "No results match your filters." : undefined}
          filtersActive={!!search}
          onClearFilters={handleClearSearch}
          action={canManage && !search ? { label: "Add holiday", onClick: onAdd } : undefined}
          compact
          className="rounded-lg border border-border bg-muted/20 py-10"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((h) => (
            <HolidayItem key={h.id} holiday={h} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
