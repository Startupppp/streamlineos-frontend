"use client";

import { memo, useCallback } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import { DisplayToggleRow } from "@/features/build/shared/display-toggle-row";
import type { ViewType } from "./view-switcher";
import type {
  DisplayOptions,
  ColumnByOption,
  GroupByOption,
  SwimlaneBy,
  CompletedIssuesFilter,
} from "../shared/types";
import {
  DEFAULT_DISPLAY_OPTIONS,
  COLUMN_OPTIONS,
  GROUP_OPTIONS,
  ROW_OPTIONS,
  ORDER_OPTIONS,
  COMPLETED_OPTIONS,
  propertyChipsForView,
} from "./display-options-model";

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
    const match = ORDER_OPTIONS.find((option) => option.value === v);
    if (match) set("orderBy", match.value);
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
      <MobileOnlyLabelTooltip label="Display options">
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={RESPONSIVE_ICON_LABEL_TRIGGER_CLASS}
            aria-label="Display options"
          >
            <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <ResponsiveIconLabelText>Display</ResponsiveIconLabelText>
          </Button>
        </ResponsivePopoverTrigger>
      </MobileOnlyLabelTooltip>
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
                  <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Columns</p>
                  <Select value={options.columnBy} onValueChange={handleColumnByChange}>
                  <SelectTrigger aria-label="Columns" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Rows</p>
                  <Select value={options.rowBy} onValueChange={handleRowByChange}>
                  <SelectTrigger aria-label="Rows" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROW_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {isList && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Group by</p>
                  <Select value={options.groupBy} onValueChange={handleGroupByChange}>
                  <SelectTrigger aria-label="Group by" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Sub-group</p>
                  <Select value={options.rowBy} onValueChange={handleRowByChange}>
                  <SelectTrigger aria-label="Sub-group" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROW_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
              <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Ordering</p>
              <Select value={options.orderBy} onValueChange={handleOrderByChange}>
                  <SelectTrigger aria-label="Ordering" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DisplayToggleRow
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
          <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">Completed issues</p>
          <Select value={options.completedIssues} onValueChange={handleCompletedIssuesChange}>
                  <SelectTrigger aria-label="Completed issues" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPLETED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showShowSection && (
          <>
            <Separator />
            <div className="space-y-0">
              <p className="mb-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">Show</p>
              <DisplayToggleRow id="disp-sub-issues" label="Sub-issues" checked={options.showSubIssues} onCheckedChange={handleShowSubIssues} />
              {isBoard && (
                <>
                  <DisplayToggleRow id="disp-empty-columns" label="Empty columns" checked={options.showEmptyColumns} onCheckedChange={handleShowEmptyColumns} />
                  <DisplayToggleRow id="disp-empty-rows" label="Empty rows" checked={options.showEmptyRows} onCheckedChange={handleShowEmptyRows} />
                </>
              )}
              {isList && (
                <DisplayToggleRow id="disp-empty-groups" label="Empty groups" checked={options.showEmptyGroups} onCheckedChange={handleShowEmptyGroups} />
              )}
            </div>
          </>
        )}

        {propertyChips.length > 0 && (
          <>
            <Separator />
            <div className="space-y-0">
              <p className="mb-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">Properties</p>
              {propertyChips.map((chip) => (
                <DisplayToggleRow
                  key={chip.key}
                  id={`disp-prop-${chip.key}`}
                  label={chip.label}
                  checked={options[chip.key]}
                  onCheckedChange={(checked) => set(chip.key, checked)}
                />
              ))}
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
