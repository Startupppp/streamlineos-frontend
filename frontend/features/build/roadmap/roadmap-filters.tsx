"use client";

import { useState, type KeyboardEvent } from "react";
import { RotateCcw } from "lucide-react";
import { FilterTriggerButton } from "@/components/list-view/filter-trigger-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  BuildFilterSelect,
  type BuildFilterOption,
} from "@/features/build/shared/build-filter-select";

interface RoadmapFiltersProps {
  activeFilterCount: number;
  statusValue: string;
  sortValue: string;
  ownerValue: string;
  horizonValue: string;
  statusOptions: readonly BuildFilterOption[];
  sortOptions: readonly BuildFilterOption[];
  ownerOptions: readonly BuildFilterOption[];
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onHorizonCommit: (value: string) => void;
  onClear: () => void;
}

export function RoadmapFilters({
  activeFilterCount,
  statusValue,
  sortValue,
  ownerValue,
  horizonValue,
  statusOptions,
  sortOptions,
  ownerOptions,
  onStatusChange,
  onSortChange,
  onOwnerChange,
  onHorizonCommit,
  onClear,
}: RoadmapFiltersProps) {
  const [open, setOpen] = useState(false);

  function handleClear() {
    onClear();
    setOpen(false);
  }

  function handleHorizonKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onHorizonCommit(event.currentTarget.value);
  }

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen} collapseBelow="lg">
      <ResponsivePopoverTrigger asChild>
        <FilterTriggerButton
          activeFilterCount={activeFilterCount}
          label="Filters"
          showLabelOnMobile
          className="h-9 w-auto px-3 md:w-auto md:px-3"
        />
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Roadmap filters"
        description="Refine roadmap items by status, sort order, owner, or horizon."
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] space-y-4 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Roadmap filters</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Narrow the board without losing your place.
            </p>
          </div>
          {activeFilterCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <BuildFilterSelect
              label="Status"
              value={statusValue}
              onValueChange={onStatusChange}
              options={statusOptions}
              className="!w-full"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <BuildFilterSelect
              label="Sort"
              value={sortValue}
              onValueChange={onSortChange}
              options={sortOptions}
              className="!w-full"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Owner</Label>
            <BuildFilterSelect
              label="Owner"
              value={ownerValue}
              onValueChange={onOwnerChange}
              options={ownerOptions}
              className="!w-full"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="roadmap-horizon" className="text-xs text-muted-foreground">
              Horizon
            </Label>
            <Input
              key={horizonValue}
              id="roadmap-horizon"
              defaultValue={horizonValue}
              onBlur={(event) => onHorizonCommit(event.currentTarget.value)}
              onKeyDown={handleHorizonKeyDown}
              placeholder="e.g. Q3 2026"
              aria-label="Filter by horizon"
              className="w-full"
            />
          </div>
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
