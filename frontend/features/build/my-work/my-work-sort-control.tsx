"use client";

import { memo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BuildListSortField,
  BuildListSortDirection,
} from "@/features/build/shared/use-build-list-url-state";
import { BUILD_LIST_SORT_FIELDS } from "@/features/build/shared/use-build-list-url-state";

const SORT_FIELD_LABELS: Record<BuildListSortField, string> = {
  rank: "Manual",
  created: "Created",
  updated: "Updated",
  priority: "Priority",
  dueDate: "Due date",
};

interface MyWorkSortControlProps {
  sortField: BuildListSortField;
  sortDirection: BuildListSortDirection;
  onSortChange: (field: BuildListSortField, direction: BuildListSortDirection) => void;
}

export const MyWorkSortControl = memo(function MyWorkSortControl({
  sortField,
  sortDirection,
  onSortChange,
}: MyWorkSortControlProps) {
  function handleFieldChange(value: string) {
    const field = BUILD_LIST_SORT_FIELDS.find((f) => f === value);
    if (field) onSortChange(field, sortDirection);
  }

  function handleDirectionToggle() {
    onSortChange(sortField, sortDirection === "asc" ? "desc" : "asc");
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Select value={sortField} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[7.5rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUILD_LIST_SORT_FIELDS.map((field) => (
            <SelectItem key={field} value={field}>
              {SORT_FIELD_LABELS[field]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        aria-label={
          sortDirection === "asc" ? "Sort ascending" : "Sort descending"
        }
        onClick={handleDirectionToggle}
      >
        {sortDirection === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
});
