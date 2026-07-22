"use client";

import { memo, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ViewType } from "./view-switcher";
import type {
  DisplayOptions,
  ColumnByOption,
  GroupByOption,
  SwimlaneBy,
  OrderByOption,
  CompletedIssuesFilter,
} from "../shared/types";

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

const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: "none", label: "None" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "label", label: "Label" },
  { value: "cycle", label: "Cycle" },
  { value: "project", label: "Project" },
];

type PropertyKey = keyof Pick<
  DisplayOptions,
  | "showId"
  | "showStatus"
  | "showAssignee"
  | "showPriority"
  | "showEstimate"
  | "showCycle"
  | "showLabels"
  | "showDueDate"
  | "showProject"
  | "showMilestone"
  | "showLinks"
  | "showTimeInStatus"
  | "showCreated"
  | "showUpdated"
  | "showPRs"
>;

const PROPERTY_CHIPS: { key: PropertyKey; label: string }[] = [
  { key: "showId", label: "ID" },
  { key: "showStatus", label: "Status" },
  { key: "showAssignee", label: "Assignee" },
  { key: "showPriority", label: "Priority" },
  { key: "showProject", label: "Project" },
  { key: "showDueDate", label: "Due date" },
  { key: "showMilestone", label: "Milestone" },
  { key: "showCycle", label: "Cycle" },
  { key: "showEstimate", label: "Estimate" },
  { key: "showLabels", label: "Labels" },
  { key: "showLinks", label: "Links" },
  { key: "showTimeInStatus", label: "Time in status" },
  { key: "showCreated", label: "Created" },
  { key: "showUpdated", label: "Updated" },
  { key: "showPRs", label: "PRs" },
];

const BOARD_PROPERTIES: PropertyKey[] = [
  "showId",
  "showPriority",
  "showAssignee",
  "showEstimate",
  "showCycle",
  "showLabels",
  "showDueDate",
];

const LIST_PROPERTIES: PropertyKey[] = [
  "showId",
  "showPriority",
  "showAssignee",
  "showEstimate",
  "showLabels",
  "showDueDate",
];

const TABLE_PROPERTIES: PropertyKey[] = [
  "showId",
  "showStatus",
  "showPriority",
  "showAssignee",
  "showEstimate",
  "showLabels",
  "showDueDate",
  "showCycle",
];

function propertyChipsForView(viewType: ViewType): { key: PropertyKey; label: string }[] {
  const keys =
    viewType === "board"
      ? BOARD_PROPERTIES
      : viewType === "list"
        ? LIST_PROPERTIES
        : viewType === "table"
          ? TABLE_PROPERTIES
          : [];
  const keySet = new Set<PropertyKey>(keys);
  return PROPERTY_CHIPS.filter((chip) => keySet.has(chip.key));
}

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
        "flex h-9 items-center justify-center rounded border px-2 text-xs transition-colors",
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
  function handleLabelClick(event: ReactMouseEvent<HTMLLabelElement>) {
    event.preventDefault();
    onCheckedChange(!checked);
  }

  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <Label
        htmlFor={id}
        onClick={handleLabelClick}
        className="cursor-pointer text-xs font-normal"
      >
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export type { DisplayOptions };

interface DisplayOptionsPanelProps {
  viewType: ViewType;
  options: DisplayOptions;
  onChange: (opts: DisplayOptions) => void;
  onOptionsChange?: (opts: DisplayOptions) => void;
}

export const DisplayOptionsPanel = memo(function DisplayOptionsPanel({
  viewType,
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

  function handleGroupByChange(v: string) {
    const valid: readonly GroupByOption[] = ["status", "assignee", "priority", "label", "cycle", "project", "none"];
    const match = valid.find((option) => option === v);
    if (match) set("groupBy", match);
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
  function handleShowEmptyGroups(checked: boolean) { set("showEmptyGroups", checked); }

  function handleToggleProperty(key: PropertyKey) {
    set(key, !options[key]);
  }

  function handleReset() {
    onChange(DEFAULT_DISPLAY_OPTIONS);
    onOptionsChange?.(DEFAULT_DISPLAY_OPTIONS);
  }

  const isBoard = viewType === "board";
  const isList = viewType === "list";
  const isTable = viewType === "table";
  const showLayout = isBoard || isList;
  const showOrdering = isBoard || isList || isTable;
  const showShowSection = isBoard || isList || isTable;
  const propertyChips = propertyChipsForView(viewType);

  return (
    <ResponsivePopover>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <ResponsivePopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="size-9 shrink-0 gap-1 p-0 text-xs font-normal md:h-9 md:w-auto md:px-2"
                aria-label="Display options"
              >
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">Display</span>
              </Button>
            </ResponsivePopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs md:hidden">
            Display options
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ResponsivePopoverContent
        align="start"
        collisionPadding={16}
        title="Display options"
        className="w-72 space-y-3 p-3"
      >
        {showLayout && (
          <>
            {isBoard && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Columns</p>
                  <Select value={options.columnBy} onValueChange={handleColumnByChange}>
                  <SelectTrigger className="h-9 w-full">
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
                  <SelectTrigger className="h-9 w-full">
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
            )}
            {isList && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Group by</p>
                  <Select value={options.groupBy} onValueChange={handleGroupByChange}>
                  <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sub-group</p>
                  <Select value={options.rowBy} onValueChange={handleRowByChange}>
                  <SelectTrigger className="h-9 w-full">
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
            )}
            <Separator />
          </>
        )}

        {showOrdering && (
          <>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ordering</p>
              <Select value={options.orderBy} onValueChange={handleOrderByChange}>
                  <SelectTrigger className="h-9 w-full">
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
          </>
        )}

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completed issues</p>
          <Select value={options.completedIssues} onValueChange={handleCompletedIssuesChange}>
                  <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPLETED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showShowSection && (
          <>
            <Separator />
            <div className="space-y-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Show</p>
              <ToggleRow id="disp-sub-issues" label="Sub-issues" checked={options.showSubIssues} onCheckedChange={handleShowSubIssues} />
              {isBoard && (
                <>
                  <ToggleRow id="disp-empty-columns" label="Empty columns" checked={options.showEmptyColumns} onCheckedChange={handleShowEmptyColumns} />
                  <ToggleRow id="disp-empty-rows" label="Empty rows" checked={options.showEmptyRows} onCheckedChange={handleShowEmptyRows} />
                </>
              )}
              {isList && (
                <ToggleRow id="disp-empty-groups" label="Empty groups" checked={options.showEmptyGroups} onCheckedChange={handleShowEmptyGroups} />
              )}
            </div>
          </>
        )}

        {propertyChips.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Properties</p>
              <div className="grid grid-cols-2 gap-1.5">
                {propertyChips.map((chip) => (
                  <PropertyChip
                    key={chip.key}
                    label={chip.label}
                    active={options[chip.key]}
                    onToggle={() => handleToggleProperty(chip.key)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-9 w-full text-xs text-muted-foreground"
        >
          Reset to defaults
        </Button>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
});
