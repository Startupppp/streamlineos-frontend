"use client";

import { memo, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DisplayToggleRow } from "@/features/build/shared/display-toggle-row";
import type { ViewType } from "./view-switcher";
import type {
  ColumnByOption,
  CompletedIssuesFilter,
  DisplayOptions,
  GroupByOption,
  SwimlaneBy,
} from "../shared/types";
import {
  COLUMN_OPTIONS,
  COMPLETED_OPTIONS,
  DEFAULT_DISPLAY_OPTIONS,
  GROUP_OPTIONS,
  ORDER_OPTIONS,
  propertyChipsForView,
  ROW_OPTIONS,
  type PropertyKey,
} from "./display-options-model";

interface DisplayOptionsContentProps {
  viewType: ViewType;
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
  onOptionsChange?: (options: DisplayOptions) => void;
}

function DisplayPropertyToggle({
  propertyKey,
  label,
  options,
  onSet,
}: {
  propertyKey: PropertyKey;
  label: string;
  options: DisplayOptions;
  onSet: <K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) => void;
}) {
  function handleCheckedChange(checked: boolean) {
    onSet(propertyKey, checked);
  }

  return (
    <DisplayToggleRow
      id={`disp-prop-${propertyKey}`}
      label={label}
      checked={options[propertyKey]}
      onCheckedChange={handleCheckedChange}
    />
  );
}

export const DisplayOptionsContent = memo(function DisplayOptionsContent({
  viewType,
  options,
  onChange,
  onOptionsChange,
}: DisplayOptionsContentProps) {
  const set = useCallback(
    <K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) => {
      const next = { ...options, [key]: value };
      onChange(next);
      onOptionsChange?.(next);
    },
    [options, onChange, onOptionsChange],
  );

  function handleColumnByChange(value: string) {
    const valid: readonly ColumnByOption[] = ["status", "assignee", "priority", "label", "cycle", "project"];
    const match = valid.find((option) => option === value);
    if (match) set("columnBy", match);
  }

  function handleGroupByChange(value: string) {
    const valid: readonly GroupByOption[] = ["status", "assignee", "priority", "label", "cycle", "project", "none"];
    const match = valid.find((option) => option === value);
    if (match) set("groupBy", match);
  }

  function handleRowByChange(value: string) {
    const valid: readonly SwimlaneBy[] = ["none", "status", "assignee", "priority", "cycle"];
    const match = valid.find((option) => option === value);
    if (match) set("rowBy", match);
  }

  function handleOrderByChange(value: string) {
    const match = ORDER_OPTIONS.find((option) => option.value === value);
    if (match) set("orderBy", match.value);
  }

  function handleCompletedIssuesChange(value: string) {
    const valid: readonly CompletedIssuesFilter[] = ["all", "none", "last-day", "last-week", "last-month"];
    const match = valid.find((option) => option === value);
    if (match) set("completedIssues", match);
  }

  function handleOrderCompleteByRecency(checked: boolean) { set("orderCompleteByRecency", checked); }
  function handleShowSubIssues(checked: boolean) { set("showSubIssues", checked); }
  function handleShowEmptyColumns(checked: boolean) { set("showEmptyColumns", checked); }
  function handleShowEmptyRows(checked: boolean) { set("showEmptyRows", checked); }
  function handleShowEmptyGroups(checked: boolean) { set("showEmptyGroups", checked); }
  function handleReset() {
    onChange(DEFAULT_DISPLAY_OPTIONS);
    onOptionsChange?.(DEFAULT_DISPLAY_OPTIONS);
  }

  const isBoard = viewType === "board";
  const isList = viewType === "list";
  const showLayout = isBoard || isList;
  const propertyChips = propertyChipsForView(viewType);

  return (
    <div className="space-y-3">
      {showLayout ? (
        <>
          {isBoard ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Columns</p>
                <Select value={options.columnBy} onValueChange={handleColumnByChange}>
                  <SelectTrigger aria-label="Columns" className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMN_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Rows</p>
                <Select value={options.rowBy} onValueChange={handleRowByChange}>
                  <SelectTrigger aria-label="Rows" className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROW_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Group by</p>
                <Select value={options.groupBy} onValueChange={handleGroupByChange}>
                  <SelectTrigger aria-label="Group by" className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUP_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Sub-group</p>
                <Select value={options.rowBy} onValueChange={handleRowByChange}>
                  <SelectTrigger aria-label="Sub-group" className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROW_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Separator />
        </>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Ordering</p>
        <Select value={options.orderBy} onValueChange={handleOrderByChange}>
          <SelectTrigger aria-label="Ordering" className="h-9 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{ORDER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <DisplayToggleRow id="disp-order-complete" label="Order completed by recency" checked={options.orderCompleteByRecency} onCheckedChange={handleOrderCompleteByRecency} />
      </div>
      <Separator />

      <div className="space-y-1.5">
        <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Completed issues</p>
        <Select value={options.completedIssues} onValueChange={handleCompletedIssuesChange}>
          <SelectTrigger aria-label="Completed issues" className="h-9 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{COMPLETED_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Separator />
      <div className="space-y-0">
        <p className="mb-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">Show</p>
        <DisplayToggleRow id="disp-sub-issues" label="Sub-issues" checked={options.showSubIssues} onCheckedChange={handleShowSubIssues} />
        {isBoard ? <>
          <DisplayToggleRow id="disp-empty-columns" label="Empty columns" checked={options.showEmptyColumns} onCheckedChange={handleShowEmptyColumns} />
          <DisplayToggleRow id="disp-empty-rows" label="Empty rows" checked={options.showEmptyRows} onCheckedChange={handleShowEmptyRows} />
        </> : null}
        {isList ? <DisplayToggleRow id="disp-empty-groups" label="Empty groups" checked={options.showEmptyGroups} onCheckedChange={handleShowEmptyGroups} /> : null}
      </div>

      {propertyChips.length > 0 ? <>
        <Separator />
        <div className="space-y-0">
          <p className="mb-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">Properties</p>
          {propertyChips.map((chip) => (
            <DisplayPropertyToggle key={chip.key} propertyKey={chip.key} label={chip.label} options={options} onSet={set} />
          ))}
        </div>
      </> : null}

      <Separator />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleReset}
        className="h-9 w-full border-primary/30 bg-primary/5 text-xs font-medium text-primary hover:border-primary/50 hover:bg-primary/10"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Reset to defaults
      </Button>
    </div>
  );
});
