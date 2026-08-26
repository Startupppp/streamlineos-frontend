"use client";

import { Download, LayoutGrid, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { DensityToggle } from "@/features/renderer/density-toggle";
import type { DensityMode } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export interface DealsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  stage: string;
  stages: Array<{ key: string; label: string }>;
  onStageChange: (value: string) => void;
  assignee: string;
  assigneeOptions: Array<{ id: string; name: string }>;
  onAssigneeChange: (value: string) => void;
  view: "table" | "kanban";
  onViewTable: () => void;
  onViewKanban: () => void;
  density: DensityMode;
  onDensityChange: (density: DensityMode) => void;
  canExport: boolean;
  onExport: () => void;
}

/**
 * The filters the deals surface has, which is not something a layout can say.
 *
 * Density sits here rather than inside the list because the toggle belongs in
 * the toolbar with the other display controls, and it is offered only for the
 * table: a board has rows of its own making.
 */
export function DealsFilterBar({
  search,
  onSearchChange,
  stage,
  stages,
  onStageChange,
  assignee,
  assigneeOptions,
  onAssigneeChange,
  view,
  onViewTable,
  onViewKanban,
  density,
  onDensityChange,
  canExport,
  onExport,
}: DealsFilterBarProps) {
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search deals..."
        aria-label="Search deals"
      />

      <Select value={stage} onValueChange={onStageChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")} aria-label="Stage">
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stages</SelectItem>
          {stages.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {assigneeOptions.length > 0 ? (
        <Select value={assignee} onValueChange={onAssigneeChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")} aria-label="Owner">
            <SelectValue placeholder="All assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {assigneeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {view === "table" ? <DensityToggle density={density} onChange={onDensityChange} /> : null}

      <div className="ml-auto flex shrink-0 items-center gap-px rounded-md border border-border">
        <Button
          variant={view === "table" ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-r-none border-r border-border"
          onClick={onViewTable}
          aria-label="Table view"
        >
          <TableIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={view === "kanban" ? "secondary" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-l-none"
          onClick={onViewKanban}
          aria-label="Kanban view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 text-xs"
        onClick={onExport}
        disabled={!canExport}
        title={canExport ? undefined : "No deals to export"}
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export
      </Button>
    </div>
  );
}
