"use client";

import { memo, useCallback } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { DisplayOptions, GroupByOption, OrderByOption } from "../shared/types";

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  groupBy: "status",
  orderBy: "manual",
  showSubIssues: false,
  showEmptyGroups: true,
  showId: true,
  showStatus: true,
  showAssignee: true,
  showPriority: true,
  showEstimate: true,
  showCycle: true,
  showLabels: true,
  showDueDate: true,
};

const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "label", label: "Label" },
  { value: "cycle", label: "Cycle" },
  { value: "none", label: "None" },
];

const ORDER_OPTIONS: { value: OrderByOption; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "created", label: "Created" },
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due date" },
];

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

interface DisplayOptionsPanelProps {
  options: DisplayOptions;
  onChange: (opts: DisplayOptions) => void;
}

export const DisplayOptionsPanel = memo(function DisplayOptionsPanel({
  options,
  onChange,
}: DisplayOptionsPanelProps) {
  const set = useCallback(
    <K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) => {
      onChange({ ...options, [key]: value });
    },
    [options, onChange],
  );

  function handleGroupByChange(value: string) {
    if (
      value === "status" ||
      value === "assignee" ||
      value === "priority" ||
      value === "label" ||
      value === "cycle" ||
      value === "none"
    ) {
      set("groupBy", value);
    }
  }

  function handleOrderByChange(value: string) {
    if (
      value === "created" ||
      value === "priority" ||
      value === "dueDate" ||
      value === "manual"
    ) {
      set("orderBy", value);
    }
  }

  function handleShowSubIssues(checked: boolean) { set("showSubIssues", checked); }
  function handleShowEmptyGroups(checked: boolean) { set("showEmptyGroups", checked); }
  function handleShowId(checked: boolean) { set("showId", checked); }
  function handleShowStatus(checked: boolean) { set("showStatus", checked); }
  function handleShowAssignee(checked: boolean) { set("showAssignee", checked); }
  function handleShowPriority(checked: boolean) { set("showPriority", checked); }
  function handleShowEstimate(checked: boolean) { set("showEstimate", checked); }
  function handleShowCycle(checked: boolean) { set("showCycle", checked); }
  function handleShowLabels(checked: boolean) { set("showLabels", checked); }
  function handleShowDueDate(checked: boolean) { set("showDueDate", checked); }

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
      <PopoverContent align="start" className="w-56 p-3 space-y-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Grouping</p>
          <Select value={options.groupBy} onValueChange={handleGroupByChange}>
            <SelectTrigger className="h-7 w-full bg-card text-xs">
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
        </div>

        <Separator />

        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Display</p>
          <ToggleRow id="disp-sub-issues" label="Sub-issues" checked={options.showSubIssues} onCheckedChange={handleShowSubIssues} />
          <ToggleRow id="disp-empty-groups" label="Empty groups" checked={options.showEmptyGroups} onCheckedChange={handleShowEmptyGroups} />
        </div>

        <Separator />

        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Properties</p>
          <ToggleRow id="disp-id" label="ID" checked={options.showId} onCheckedChange={handleShowId} />
          <ToggleRow id="disp-status" label="Status" checked={options.showStatus} onCheckedChange={handleShowStatus} />
          <ToggleRow id="disp-assignee" label="Assignee" checked={options.showAssignee} onCheckedChange={handleShowAssignee} />
          <ToggleRow id="disp-priority" label="Priority" checked={options.showPriority} onCheckedChange={handleShowPriority} />
          <ToggleRow id="disp-estimate" label="Estimate" checked={options.showEstimate} onCheckedChange={handleShowEstimate} />
          <ToggleRow id="disp-cycle" label="Cycle" checked={options.showCycle} onCheckedChange={handleShowCycle} />
          <ToggleRow id="disp-labels" label="Labels" checked={options.showLabels} onCheckedChange={handleShowLabels} />
          <ToggleRow id="disp-due-date" label="Due date" checked={options.showDueDate} onCheckedChange={handleShowDueDate} />
        </div>
      </PopoverContent>
    </Popover>
  );
});
