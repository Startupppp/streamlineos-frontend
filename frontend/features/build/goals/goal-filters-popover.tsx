"use client";

import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import type { GoalLevel, GoalStatus } from "@/hooks/api/goals";
import { LEVEL_OPTIONS, STATUS_OPTIONS } from "./constants";

interface GoalLevelStatusFiltersProps {
  levelFilter: GoalLevel | "all";
  statusFilter: GoalStatus | "all";
  onLevelChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  layout?: "inline" | "stack";
}

export function GoalLevelStatusFilters({
  levelFilter,
  statusFilter,
  onLevelChange,
  onStatusChange,
  layout = "inline",
}: GoalLevelStatusFiltersProps) {
  const stacked = layout === "stack";

  const levelSelect = (
    <Select value={levelFilter} onValueChange={onLevelChange}>
      <SelectTrigger
        id={stacked ? "goal-filter-level" : undefined}
        aria-label="Filter by level"
        className={cn(
          FILTER_SELECT_TRIGGER,
          "h-9 text-sm",
          stacked ? "w-full" : "w-[130px]",
        )}
      >
        <SelectValue placeholder="Level" />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="all">All Levels</SelectItem>
        {LEVEL_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const statusSelect = (
    <Select value={statusFilter} onValueChange={onStatusChange}>
      <SelectTrigger
        id={stacked ? "goal-filter-status" : undefined}
        aria-label="Filter by status"
        className={cn(
          FILTER_SELECT_TRIGGER,
          "h-9 text-sm",
          stacked ? "w-full" : "w-[140px]",
        )}
      >
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="all">All Statuses</SelectItem>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (stacked) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="goal-filter-level"
            className="text-dense font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Level
          </Label>
          {levelSelect}
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="goal-filter-status"
            className="text-dense font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Status
          </Label>
          {statusSelect}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      {levelSelect}
      {statusSelect}
    </div>
  );
}

interface GoalFiltersPopoverProps {
  levelFilter: GoalLevel | "all";
  statusFilter: GoalStatus | "all";
  onLevelChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function GoalFiltersPopover({
  levelFilter,
  statusFilter,
  onLevelChange,
  onStatusChange,
}: GoalFiltersPopoverProps) {
  const activeCount =
    (levelFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);
  const hasAny = activeCount > 0;

  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Filter goals"
          className={cn(
            "h-9 gap-1.5 text-xs",
            hasAny && "border-primary/40 bg-primary/5 text-primary",
          )}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {hasAny ? (
            <Badge className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-micro">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        title="Filters"
        className="w-72 space-y-3 p-3"
      >
        <p className="text-label font-semibold text-foreground">Filters</p>
        <GoalLevelStatusFilters
          levelFilter={levelFilter}
          statusFilter={statusFilter}
          onLevelChange={onLevelChange}
          onStatusChange={onStatusChange}
          layout="stack"
        />
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
