"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  DisplayPrefs,
  ProjectGroupBy,
  ProjectOrderBy,
  ProjectSortDir,
} from "./use-display-prefs";

interface DisplayPrefsPopoverProps {
  prefs: DisplayPrefs;
  onToggle: (key: keyof DisplayPrefs) => void;
  onSet: (next: Partial<DisplayPrefs>) => void;
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
  id: string;
}

function ToggleRow({ label, checked, onCheckedChange, id }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <Label htmlFor={id} className="cursor-pointer text-[13px] font-normal text-foreground">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="h-4 w-7 [&_span]:h-3 [&_span]:w-3" />
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </p>
  );
}

const GROUP_OPTIONS: { value: ProjectGroupBy; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "status", label: "Status" },
  { value: "lead", label: "Lead" },
];

const ORDER_OPTIONS: { value: ProjectOrderBy; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "targetDate", label: "Target date" },
  { value: "progress", label: "Progress" },
  { value: "createdAt", label: "Created" },
];

const PROPERTY_TOGGLES: { key: keyof DisplayPrefs; label: string }[] = [
  { key: "showSummary", label: "Summary" },
  { key: "showStatus", label: "Status" },
  { key: "showPriority", label: "Priority" },
  { key: "showHealth", label: "Health" },
  { key: "showLead", label: "Lead" },
  { key: "showMembers", label: "Members" },
  { key: "showTargetDate", label: "Target date" },
  { key: "showStartDate", label: "Start date" },
  { key: "showProgress", label: "Progress" },
  { key: "showIssueCount", label: "Issues" },
];

export function DisplayPrefsPopover({
  prefs,
  onToggle,
  onSet,
}: DisplayPrefsPopoverProps) {
  function handleGroupByChange(value: string) {
    onSet({ groupBy: value as ProjectGroupBy });
  }

  function handleOrderByChange(value: string) {
    onSet({ orderBy: value as ProjectOrderBy });
  }

  function handleOrderDirChange(value: string) {
    onSet({ orderDir: value as ProjectSortDir });
  }

  function handleShowClosedChange() {
    onToggle("showClosed");
  }

  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Display
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        title="Display options"
        className="w-60 p-3"
      >
        <p className="mb-3 text-[13px] font-semibold text-foreground">Display options</p>

        <SectionLabel>Group by</SectionLabel>
        <Select value={prefs.groupBy} onValueChange={handleGroupByChange}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SectionLabel>Order by</SectionLabel>
        <div className="flex gap-1.5">
          <Select value={prefs.orderBy} onValueChange={handleOrderByChange}>
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prefs.orderDir} onValueChange={handleOrderDirChange}>
            <SelectTrigger className="h-7 w-[68px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc" className="text-xs">Asc</SelectItem>
              <SelectItem value="desc" className="text-xs">Desc</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={cn("my-2 border-t border-border")} />

        <ToggleRow
          id="show-closed"
          label="Show closed projects"
          checked={prefs.showClosed}
          onCheckedChange={handleShowClosedChange}
        />

        <SectionLabel>Properties</SectionLabel>
        <div className="space-y-0.5">
          {PROPERTY_TOGGLES.map((p) => (
            <ToggleRow
              key={p.key}
              id={`toggle-${p.key}`}
              label={p.label}
              checked={prefs[p.key] as boolean}
              onCheckedChange={() => onToggle(p.key)}
            />
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
