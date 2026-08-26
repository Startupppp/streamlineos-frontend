"use client";

import type { MouseEvent } from "react";
import { GitMergeIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * The row and bulk controls the companies list wraps around the generated table.
 *
 * They live outside the description because what a row may do depends on the
 * caller's permissions, which is a property of the person rather than of the
 * record. The merge checkbox sits in the trailing actions cell rather than in
 * `DataTable`'s leading `selection` column — which `RecordList` does forward —
 * because that column carries a select-all header and merge takes exactly two.
 */

export interface CompanyRowActionsProps {
  companyId: number;
  companyName: string;
  selected: boolean;
  canSelect: boolean;
  canDelete: boolean;
  onSelect: (companyId: number, selected: boolean) => void;
  onDelete: (companyId: number) => void;
}

export function CompanyRowActions({
  companyId,
  companyName,
  selected,
  canSelect,
  canDelete,
  onSelect,
  onDelete,
}: CompanyRowActionsProps) {
  function handleSelectedChange(next: boolean | "indeterminate") {
    onSelect(companyId, next === true);
  }

  function handleStopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onDelete(companyId);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canSelect ? (
        <Checkbox
          checked={selected}
          onCheckedChange={handleSelectedChange}
          onClick={handleStopPropagation}
          aria-label={`Select ${companyName} to merge`}
        />
      ) : null}
      {canDelete ? (
        <AnimatedIconButton
          icon={Trash2Icon}
          variant="ghost"
          size="icon"
          className="w-7 text-destructive hover:text-destructive"
          aria-label={`Delete ${companyName}`}
          onClick={handleDelete}
        />
      ) : null}
    </div>
  );
}

export interface CompanySelectionBarProps {
  count: number;
  canMerge: boolean;
  onMerge: () => void;
  onClear: () => void;
}

export function CompanySelectionBar({
  count,
  canMerge,
  onMerge,
  onClear,
}: CompanySelectionBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
      <span className="font-medium tabular-nums">{count} selected</span>
      <span className="text-muted-foreground">
        {canMerge ? "Merge folds the second into the first." : "Select exactly two to merge."}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {canMerge ? (
          <AnimatedIconButton
            icon={GitMergeIcon}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            onClick={onMerge}
          >
            Merge
          </AnimatedIconButton>
        ) : null}
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
