"use client";

import { memo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutGrid, List, Table2, Calendar, BarChart3, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pmSpring } from "@/features/projects/shared/pm-motion";

export type ViewType = "board" | "list" | "table" | "calendar" | "gantt" | "workload";

const VIEW_TYPES: readonly ViewType[] = ["board", "list", "table", "calendar", "gantt", "workload"];

export function parseViewType(value: string | null): ViewType {
  if (!value) return "board";
  return VIEW_TYPES.find((v) => v === value) ?? "board";
}

interface ViewSwitcherProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
  allowedViews?: readonly ViewType[];
  layoutId?: string;
}

const ALL_VIEWS = [
  { value: "board" as const, icon: LayoutGrid, label: "Board" },
  { value: "list" as const, icon: List, label: "List" },
  { value: "table" as const, icon: Table2, label: "Table" },
  { value: "calendar" as const, icon: Calendar, label: "Calendar" },
  { value: "gantt" as const, icon: BarChart3, label: "Gantt" },
  { value: "workload" as const, icon: Users, label: "Workload" },
];

export const ViewSwitcher = memo(function ViewSwitcher({
  activeView,
  onViewChange,
  className,
  allowedViews,
  layoutId = "pm-view-pill",
}: ViewSwitcherProps) {
  const shouldReduceMotion = useReducedMotion();
  const views = allowedViews
    ? ALL_VIEWS.filter((v) => allowedViews.includes(v.value))
    : ALL_VIEWS;

  const handleSelectChange = useCallback(
    (value: string) => {
      if (
        value === "board" ||
        value === "list" ||
        value === "table" ||
        value === "calendar" ||
        value === "gantt" ||
        value === "workload"
      ) {
        if (allowedViews && !allowedViews.includes(value)) return;
        onViewChange(value);
      }
    },
    [allowedViews, onViewChange],
  );

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <div
        className="relative hidden h-9 items-center gap-1 rounded-lg border border-border bg-card p-1 sm:inline-flex"
        role="tablist"
        aria-label="Board view"
      >
        {views.map((v) => {
          const active = activeView === v.value;
          const Icon = v.icon;
          function handleClick() {
            onViewChange(v.value);
          }
          return (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={handleClick}
              className={cn(
                "relative z-10 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium leading-none",
                "transition-colors duration-150",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 -z-10 rounded-md border border-primary/20 bg-card shadow-[0_0_12px_-4px] shadow-primary/30"
                  transition={shouldReduceMotion ? { duration: 0 } : pmSpring}
                />
              ) : null}
              <Icon className={cn("h-3.5 w-3.5", active && "text-primary")} />
              <span className="hidden lg:inline">{v.label}</span>
            </button>
          );
        })}
      </div>

      <Select value={activeView} onValueChange={handleSelectChange}>
        <SelectTrigger
          className="w-[128px] shrink-0 text-xs sm:hidden"
          aria-label="Select view"
        >
          <SelectValue />
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
    </div>
  );
});
