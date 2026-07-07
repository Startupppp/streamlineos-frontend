"use client";

import { memo } from "react";
import { LayoutGrid, List, Table2, Calendar, BarChart3, Users } from "lucide-react";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";

export type ViewType = "board" | "list" | "table" | "calendar" | "gantt" | "workload";

interface ViewSwitcherProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views: ViewOption<ViewType>[] = [
  { value: "board", icon: LayoutGrid, label: "Board" },
  { value: "list", icon: List, label: "List" },
  { value: "table", icon: Table2, label: "Table" },
  { value: "calendar", icon: Calendar, label: "Calendar" },
  { value: "gantt", icon: BarChart3, label: "Gantt" },
  { value: "workload", icon: Users, label: "Workload" },
];

export const ViewSwitcher = memo(function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <ViewToggle
      value={activeView}
      options={views}
      onChange={onViewChange}
      showLabel
      className="bg-card"
    />
  );
});
