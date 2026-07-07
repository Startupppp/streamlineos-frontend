"use client";

import { memo } from "react";
import { LayoutGrid, List, Table2, Calendar, BarChart3, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ViewType = "board" | "list" | "table" | "calendar" | "gantt" | "workload";

interface ViewSwitcherProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views = [
  { value: "board" as const, icon: LayoutGrid, label: "Board" },
  { value: "list" as const, icon: List, label: "List" },
  { value: "table" as const, icon: Table2, label: "Table" },
  { value: "calendar" as const, icon: Calendar, label: "Calendar" },
  { value: "gantt" as const, icon: BarChart3, label: "Gantt" },
  { value: "workload" as const, icon: Users, label: "Workload" },
];

export const ViewSwitcher = memo(function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  const active = views.find((v) => v.value === activeView);
  const ActiveIcon = active?.icon ?? LayoutGrid;

  function handleViewChange(value: string) {
    if (
      value === "board" ||
      value === "list" ||
      value === "table" ||
      value === "calendar" ||
      value === "gantt" ||
      value === "workload"
    ) {
      onViewChange(value);
    }
  }

  return (
    <Select value={activeView} onValueChange={handleViewChange}>
      <SelectTrigger className="h-8 w-[128px] shrink-0 bg-card text-xs" aria-label="Select view">
        <span className="flex items-center gap-1.5">
          <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {views.map((v) => (
          <SelectItem key={v.value} value={v.value} className="text-xs">
            <span className="flex items-center gap-1.5">
              <v.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {v.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
