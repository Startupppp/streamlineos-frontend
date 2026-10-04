"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FilterChip } from "./filter-chip";
import type { FilterEnvelopeV1, FilterClause, FilterGroup as FilterGroupType } from "@/lib/filter-envelope/filter-envelope-v1";
import {
  isFilterClause,
  isFilterGroup,
  removeClauseAtIndex,
  buildEmptyEnvelope,
} from "@/lib/filter-envelope/filter-envelope-v1";
import { Button } from "@/components/ui/button";

export interface FilterGroupProps {
  envelope: FilterEnvelopeV1;
  onChange: (next: FilterEnvelopeV1) => void;
  onClear?: () => void;
  fieldLabels?: Record<string, string>;
  className?: string;
}

function renderClauseValue(clause: FilterClause): string {
  if (Array.isArray(clause.value)) return clause.value.join(", ");
  if (clause.value === null) return "(empty)";
  return String(clause.value);
}

function renderOperatorLabel(op: string): string {
  const labels: Record<string, string> = {
    "is": "is",
    "is-not": "is not",
    "before": "before",
    "after": "after",
    "contains": "contains",
    "contains-any": "contains any of",
    "contains-none": "contains none of",
    "between": "between",
    "gt": ">",
    "lt": "<",
    "is-empty": "is empty",
    "is-not-empty": "is not empty",
  };
  return labels[op] ?? op;
}

interface TopLevelClauseChipProps {
  clause: FilterClause;
  index: number;
  fieldLabels: Record<string, string>;
  onRemoveTopLevel: (index: number) => void;
}

function TopLevelClauseChip({
  clause,
  index,
  fieldLabels,
  onRemoveTopLevel,
}: TopLevelClauseChipProps) {
  const handleRemove = React.useCallback(
    () => onRemoveTopLevel(index),
    [index, onRemoveTopLevel],
  );
  const fieldLabel = fieldLabels[clause.field] ?? clause.field;
  const valueLabel = `${renderOperatorLabel(clause.op)} ${renderClauseValue(clause)}`;
  return (
    <FilterChip
      key={`clause-${index}`}
      label={fieldLabel}
      value={valueLabel}
      onRemove={handleRemove}
    />
  );
}

interface GroupClauseChipProps {
  clause: FilterClause;
  groupIndex: number;
  clauseIndex: number;
  fieldLabels: Record<string, string>;
  onRemoveInGroup: (groupIndex: number, clauseIndex: number) => void;
}

function GroupClauseChip({
  clause,
  groupIndex,
  clauseIndex,
  fieldLabels,
  onRemoveInGroup,
}: GroupClauseChipProps) {
  const handleRemove = React.useCallback(
    () => onRemoveInGroup(groupIndex, clauseIndex),
    [groupIndex, clauseIndex, onRemoveInGroup],
  );
  const fieldLabel = fieldLabels[clause.field] ?? clause.field;
  const valueLabel = `${renderOperatorLabel(clause.op)} ${renderClauseValue(clause)}`;
  return (
    <FilterChip
      key={`group-${groupIndex}-clause-${clauseIndex}`}
      label={fieldLabel}
      value={valueLabel}
      onRemove={handleRemove}
    />
  );
}

interface FilterGroupItemProps {
  item: FilterClause | FilterGroupType;
  index: number;
  fieldLabels: Record<string, string>;
  onRemoveTopLevel: (index: number) => void;
  onRemoveInGroup: (groupIndex: number, clauseIndex: number) => void;
}

function FilterGroupItem({
  item,
  index,
  fieldLabels,
  onRemoveTopLevel,
  onRemoveInGroup,
}: FilterGroupItemProps) {
  if (isFilterClause(item)) {
    return (
      <TopLevelClauseChip
        clause={item}
        index={index}
        fieldLabels={fieldLabels}
        onRemoveTopLevel={onRemoveTopLevel}
      />
    );
  }

  if (isFilterGroup(item)) {
    return (
      <span
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-dashed border-border/60 px-1.5 py-0.5"
        role="group"
        aria-label={`Filter group (${item.logic.toUpperCase()})`}
      >
        <span className="shrink-0 text-xs font-medium uppercase text-muted-foreground">
          {item.logic}
        </span>
        {item.filters.map((clause, ci) => (
          <GroupClauseChip
            key={`group-${index}-clause-${ci}`}
            clause={clause}
            groupIndex={index}
            clauseIndex={ci}
            fieldLabels={fieldLabels}
            onRemoveInGroup={onRemoveInGroup}
          />
        ))}
      </span>
    );
  }

  return null;
}

export function FilterGroup({
  envelope,
  onChange,
  onClear,
  fieldLabels = {},
  className,
}: FilterGroupProps) {
  const hasFilters = envelope.filters.length > 0;

  const handleRemoveTopLevel = React.useCallback(
    (index: number) => {
      onChange(removeClauseAtIndex(envelope, index));
    },
    [envelope, onChange],
  );

  const handleRemoveInGroup = React.useCallback(
    (groupIndex: number, clauseIndex: number) => {
      const newFilters = envelope.filters.map((item, gi) => {
        if (gi !== groupIndex || !isFilterGroup(item)) return item;
        const newGroupFilters = item.filters.filter((_, ci) => ci !== clauseIndex);
        return { ...item, filters: newGroupFilters };
      }).filter((item) => {
        if (isFilterGroup(item)) return item.filters.length > 0;
        return true;
      });
      onChange({ ...envelope, filters: newFilters });
    },
    [envelope, onChange],
  );

  const handleClear = React.useCallback(() => {
    if (onClear) {
      onClear();
    } else {
      onChange(buildEmptyEnvelope(envelope.logic));
    }
  }, [envelope.logic, onClear, onChange]);

  if (!hasFilters) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5",
        className,
      )}
      role="group"
      aria-label="Active filters"
    >
      {envelope.filters.map((item, index) => (
        <FilterGroupItem
          key={`item-${index}`}
          item={item}
          index={index}
          fieldLabels={fieldLabels}
          onRemoveTopLevel={handleRemoveTopLevel}
          onRemoveInGroup={handleRemoveInGroup}
        />
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 px-2 text-xs text-muted-foreground"
        onClick={handleClear}
      >
        Clear all
      </Button>
    </div>
  );
}
