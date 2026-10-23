"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrashMemberFilter } from "./trash-member-filter";

const ALL_SPACES_VALUE = "all";

interface TrashSpaceOption {
  id: number;
  name: string;
}

interface TrashFiltersMenuProps {
  deletedByMembershipId?: number;
  onMemberChange: (value: string) => void;
  spaceId?: number;
  spaces: readonly TrashSpaceOption[];
  onSpaceChange: (value: string) => void;
  deletedFrom: string;
  deletedThrough: string;
  onDeletedFromChange: (value: string) => void;
  onDeletedThroughChange: (value: string) => void;
  onClear: () => void;
}

export function TrashFiltersMenu({
  deletedByMembershipId,
  onMemberChange,
  spaceId,
  spaces,
  onSpaceChange,
  deletedFrom,
  deletedThrough,
  onDeletedFromChange,
  onDeletedThroughChange,
  onClear,
}: TrashFiltersMenuProps) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (deletedByMembershipId !== undefined ? 1 : 0) +
    (spaceId !== undefined ? 1 : 0) +
    (deletedFrom !== "" ? 1 : 0) +
    (deletedThrough !== "" ? 1 : 0);
  const filtersLabel = activeCount > 0 ? `Filters (${activeCount} active)` : "Filters";

  function handleClear() {
    onClear();
    setOpen(false);
  }

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          aria-label={filtersLabel}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          Filters
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 text-dense font-normal tabular-nums text-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="start"
        title="Filters"
        description="Narrow deleted files. Changes apply immediately."
        aria-label="Filters"
        className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 p-3"
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Deleted by</Label>
          <TrashMemberFilter value={deletedByMembershipId} onChange={onMemberChange} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Team folder</Label>
          <Select
            value={spaceId !== undefined ? String(spaceId) : ALL_SPACES_VALUE}
            onValueChange={onSpaceChange}
          >
            <SelectTrigger className="w-full" aria-label="Team folder">
              <SelectValue placeholder="All team folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SPACES_VALUE}>All team folders</SelectItem>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={String(space.id)}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Deleted from</Label>
          <DatePicker
            ariaLabel="Deleted from"
            value={deletedFrom}
            onChange={onDeletedFromChange}
            placeholder="From"
            dateFormat="dd MMM yyyy"
            clearable
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Deleted through</Label>
          <DatePicker
            ariaLabel="Deleted through"
            value={deletedThrough}
            onChange={onDeletedThroughChange}
            placeholder="Through"
            dateFormat="dd MMM yyyy"
            clearable
            className="w-full"
          />
        </div>
        {activeCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={handleClear}>
            Clear filters
          </Button>
        ) : null}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
