"use client";

import { memo, useCallback } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DisplayOptions, ColumnByOption, SwimlaneBy, OrderByOption, CompletedIssuesFilter } from "../shared/types";

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  columnBy: "status",
  rowBy: "none",
  groupBy: "status",
  orderBy: "manual",
  orderCompleteByRecency: false,
  completedIssues: "all",
  showSubIssues: false,
  showEmptyGroups: true,
  showEmptyColumns: true,
  showEmptyRows: false,
  showId: true,
  showStatus: true,
  showAssignee: true,
  showPriority: true,
  showEstimate: true,
  showCycle: true,
  showLabels: true,
  showDueDate: true,
  showProject: false,
  showMilestone: false,
  showLinks: false,
  showTimeInStatus: false,
  showCreated: false,
  showUpdated: false,
  showPRs: false,
};

const COLUMN_OPTIONS: { value: ColumnByOption; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "label", label: "Label" },
  { value: "cycle", label: "Cycle" },
  { value: "project", label: "Project" },
];

const ROW_OPTIONS: { value: SwimlaneBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "cycle", label: "Cycle" },
];

const ORDER_OPTIONS: { value: OrderByOption; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "created", label: "Created" },
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due date" },
];

const COMPLETED_OPTIONS: { value: CompletedIssuesFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "none", label: "None" },
  { value: "last-day", label: "Last day" },
  { value: "last-week", label: "Last week" },
  { value: "last-month", label: "Last month" },
];

interface PropertyChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

function PropertyChip({ label, active, onToggle }: PropertyChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "border rounded px-2 py-1 text-xs transition-colors",
        active
          ? "bg-primary/10 border-primary/40 text-primary"
          : "border-border text-muted-foreground hover:border-primary/30",
      )}
    >
      {label}
    </button>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({ id, label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label htmlFor={id} className="cursor-pointer text-xs font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="scale-75" />
    </div>
  );
}

export type { DisplayOptions };

interface DisplayOptionsPanelProps {
  options: DisplayOptions;
  onChange: (opts: DisplayOptions) => void;
  onOptionsChange?: (opts: DisplayOptions) => void;
}

export const DisplayOptionsPanel = memo(function DisplayOptionsPanel({
  options,
  onChange,
  onOptionsChange,
}: DisplayOptionsPanelProps) {
  const set = useCallback(
    <K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) => {
      const next = { ...options, [key]: value };
      onChange(next);
      onOptionsChange?.(next);
    },
    [options, onChange, onOptionsChange],
  );

  function handleColumnByChange(v: string) {
    const valid: readonly ColumnByOption[] = ["status", "assignee", "priority", "label", "cycle", "project"];
    const match = valid.find((option) => option === v);
    if (match) set("columnBy", match);
  }

  function handleRowByChange(v: string) {
    const valid: readonly SwimlaneBy[] = ["none", "status", "assignee", "priority", "cycle"];
    const match = valid.find((option) => option === v);
    if (match) set("rowBy", match);
  }

  function handleOrderByChange(v: string) {
    const valid: readonly OrderByOption[] = ["manual", "created", "priority", "dueDate"];
    const match = valid.find((option) => option === v);
    if (match) set("orderBy", match);
  }

  function handleCompletedIssuesChange(v: string) {
    const valid: readonly CompletedIssuesFilter[] = ["all", "none", "last-day", "last-week", "last-month"];
    const match = valid.find((option) => option === v);
    if (match) set("completedIssues", match);
  }

  function handleOrderCompleteByRecency(checked: boolean) { set("orderCompleteByRecency", checked); }
  function handleShowSubIssues(checked: boolean) { set("showSubIssues", checked); }
  function handleShowEmptyColumns(checked: boolean) { set("showEmptyColumns", checked); }
  function handleShowEmptyRows(checked: boolean) { set("showEmptyRows", checked); }

  function handleToggleId() { set("showId", !options.showId); }
  function handleToggleStatus() { set("showStatus", !options.showStatus); }
  function handleToggleAssignee() { set("showAssignee", !options.showAssignee); }
  function handleTogglePriority() { set("showPriority", !options.showPriority); }
  function handleToggleProject() { set("showProject", !options.showProject); }
  function handleToggleDueDate() { set("showDueDate", !options.showDueDate); }
  function handleToggleMilestone() { set("showMilestone", !options.showMilestone); }
  function handleToggleCycle() { set("showCycle", !options.showCycle); }
  function handleToggleEstimate() { set("showEstimate", !options.showEstimate); }
  function handleToggleLabels() { set("showLabels", !options.showLabels); }
  function handleToggleLinks() { set("showLinks", !options.showLinks); }
  function handleToggleTimeInStatus() { set("showTimeInStatus", !options.showTimeInStatus); }
  function handleToggleCreated() { set("showCreated", !options.showCreated); }
  function handleToggleUpdated() { set("showUpdated", !options.showUpdated); }
  function handleTogglePRs() { set("showPRs", !options.showPRs); }

  function handleReset() {
    onChange(DEFAULT_DISPLAY_OPTIONS);
    onOptionsChange?.(DEFAULT_DISPLAY_OPTIONS);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 bg-card px-2.5 text-xs font-normal"
          aria-label="Display options"
        >
          <Settings2 className="h-3.5 w-3.5 shrink-0" />
          Display
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-72 p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Columns</p>
            <Select value={options.columnBy} onValueChange={handleColumnByChange}>
              <SelectTrigger className="h-7 w-full bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rows</p>
            <Select value={options.rowBy} onValueChange={handleRowByChange}>
              <SelectTrigger className="h-7 w-full bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROW_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ordering</p>
          <Select value={options.orderBy} onValueChange={handleOrderByChange}>
            <SelectTrigger className="h-7 w-full bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleRow
            id="disp-order-complete"
            label="Order completed by recency"
            checked={options.orderCompleteByRecency}
            onCheckedChange={handleOrderCompleteByRecency}
          />
        </div>

        <Separator />

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completed issues</p>
          <Select value={options.completedIssues} onValueChange={handleCompletedIssuesChange}>
            <SelectTrigger className="h-7 w-full bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPLETED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Show</p>
          <ToggleRow id="disp-sub-issues" label="Sub-issues" checked={options.showSubIssues} onCheckedChange={handleShowSubIssues} />
          <ToggleRow id="disp-empty-columns" label="Empty columns" checked={options.showEmptyColumns} onCheckedChange={handleShowEmptyColumns} />
          <ToggleRow id="disp-empty-rows" label="Empty rows" checked={options.showEmptyRows} onCheckedChange={handleShowEmptyRows} />
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Properties</p>
          <div className="grid grid-cols-2 gap-1.5">
            <PropertyChip label="ID" active={options.showId} onToggle={handleToggleId} />
            <PropertyChip label="Status" active={options.showStatus} onToggle={handleToggleStatus} />
            <PropertyChip label="Assignee" active={options.showAssignee} onToggle={handleToggleAssignee} />
            <PropertyChip label="Priority" active={options.showPriority} onToggle={handleTogglePriority} />
            <PropertyChip label="Project" active={options.showProject} onToggle={handleToggleProject} />
            <PropertyChip label="Due date" active={options.showDueDate} onToggle={handleToggleDueDate} />
            <PropertyChip label="Milestone" active={options.showMilestone} onToggle={handleToggleMilestone} />
            <PropertyChip label="Cycle" active={options.showCycle} onToggle={handleToggleCycle} />
            <PropertyChip label="Estimate" active={options.showEstimate} onToggle={handleToggleEstimate} />
            <PropertyChip label="Labels" active={options.showLabels} onToggle={handleToggleLabels} />
            <PropertyChip label="Links" active={options.showLinks} onToggle={handleToggleLinks} />
            <PropertyChip label="Time in status" active={options.showTimeInStatus} onToggle={handleToggleTimeInStatus} />
            <PropertyChip label="Created" active={options.showCreated} onToggle={handleToggleCreated} />
            <PropertyChip label="Updated" active={options.showUpdated} onToggle={handleToggleUpdated} />
            <PropertyChip label="PRs" active={options.showPRs} onToggle={handleTogglePRs} />
          </div>
        </div>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="w-full h-7 text-xs text-muted-foreground"
        >
          Reset to defaults
        </Button>
      </PopoverContent>
    </Popover>
  );
});
