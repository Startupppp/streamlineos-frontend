"use client";

import type { ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { PmPanel } from "@/components/pm-chrome";
import { List, Table2, LayoutGrid, CalendarDays, GanttChartSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AllWorkView = "list" | "table" | "board" | "calendar" | "timeline";

export const VIEW_OPTIONS: {
  value: AllWorkView;
  icon: ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { value: "list", icon: List, label: "List" },
  { value: "table", icon: Table2, label: "Table" },
  { value: "board", icon: LayoutGrid, label: "Board" },
  { value: "calendar", icon: CalendarDays, label: "Calendar" },
  { value: "timeline", icon: GanttChartSquare, label: "Timeline" },
];

export function parseView(raw: string | null): AllWorkView {
  if (raw === "table" || raw === "board" || raw === "calendar" || raw === "timeline") return raw;
  return "list";
}

export function AllWorkSkeleton({ view }: { view: AllWorkView }) {
  if (view === "board") {
    return (
      <PmPanel solid className="flex min-h-0 flex-1 overflow-x-auto p-3">
        <KanbanBoardSkeleton />
      </PmPanel>
    );
  }
  if (view === "table") {
    return <DataTableSkeleton headers={["ID", "Title", "Status", "Priority", "Assignee", "Due Date"]} rows={12} mobileCards className="min-h-0 flex-1" />;
  }
  if (view === "calendar" || view === "timeline") {
    return (
      <PmPanel solid className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-xl" />)}
      </PmPanel>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={groupIndex} data-slot="all-work-group-skeleton" className="contents">
          <PmPanel className="shrink-0 overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/50 px-3 py-2.5 sm:px-4">
              <Skeleton className="size-7 rounded-lg" /><Skeleton className="h-5 w-14 rounded-md" /><Skeleton className="h-4 w-40" /><Skeleton className="ml-auto h-6 w-8 rounded-full" />
            </div>
            <div className="divide-y divide-border/60">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div key={rowIndex} className="flex h-10 items-center gap-3 px-3 sm:px-4">
                  <Skeleton className="size-4 rounded-sm" /><Skeleton className="h-4 w-16 rounded-md" /><Skeleton className="h-4 min-w-0 flex-1" /><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="size-6 rounded-full" />
                </div>
              ))}
            </div>
          </PmPanel>
        </div>
      ))}
    </div>
  );
}

export function AllWorkToolbarSkeleton() {
  return (
    <div data-slot="all-work-toolbar-skeleton" className="grid w-full min-w-0 gap-2 md:grid-cols-[2.25rem_minmax(0,1fr)] md:items-center lg:grid-cols-[minmax(12rem,1fr)_auto]">
      <Skeleton className="h-9 w-full rounded-md md:col-span-2 lg:col-span-1" />
      <div className="flex min-w-0 items-center justify-end gap-2 overflow-hidden">
        <Skeleton className="h-9 w-28 shrink-0 rounded-md" /><Skeleton className="h-9 w-32 shrink-0 rounded-md" /><Skeleton className="h-9 w-9 shrink-0 rounded-md" /><Skeleton className="h-9 w-9 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

interface AllWorkViewSwitcherProps {
  activeView: AllWorkView;
  onViewChange: (v: AllWorkView) => void;
}

export function AllWorkViewSwitcher({ activeView, onViewChange }: AllWorkViewSwitcherProps) {
  function handleChange(value: string) {
    if (
      value === "list" ||
      value === "table" ||
      value === "board" ||
      value === "calendar" ||
      value === "timeline"
    ) {
      onViewChange(value);
    }
  }

  return (
    <Select value={activeView} onValueChange={handleChange}>
      <SelectTrigger
        className="w-[110px] shrink-0 font-normal *:data-[slot=select-value]:font-normal"
        aria-label="Select view"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VIEW_OPTIONS.map((v) => (
          <SelectItem key={v.value} value={v.value}>
            <span className="flex items-center gap-1.5">
              <v.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {v.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
