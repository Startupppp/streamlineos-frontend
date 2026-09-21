"use client";

import { memo, useCallback, type ComponentType, type Ref } from "react";
import { Calendar, Table2 } from "lucide-react";
import {
  ChartBarIcon,
  LayoutGridIcon,
  LayoutListIcon,
  UsersIcon,
} from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isViewType, type ViewType } from "@/lib/build/view-types";

export type { ViewType } from "@/lib/build/view-types";
export { parseViewType } from "@/lib/build/view-types";

interface ViewSwitcherProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
  allowedViews?: readonly ViewType[];
}

type AnimatedViewIcon = ComponentType<{
  ref?: Ref<IconHandle>;
  size?: number;
  className?: string;
}>;

type StaticViewIcon = ComponentType<{ className?: string }>;

const ALL_VIEWS: {
  value: ViewType;
  animatedIcon?: AnimatedViewIcon;
  staticIcon?: StaticViewIcon;
  label: string;
}[] = [
  { value: "board", animatedIcon: LayoutGridIcon, label: "Board" },
  { value: "list", animatedIcon: LayoutListIcon, label: "List" },
  { value: "table", staticIcon: Table2, label: "Table" },
  { value: "calendar", staticIcon: Calendar, label: "Calendar" },
  { value: "gantt", animatedIcon: ChartBarIcon, label: "Gantt" },
  { value: "workload", animatedIcon: UsersIcon, label: "Workload" },
];

export const ViewSwitcher = memo(function ViewSwitcher({
  activeView,
  onViewChange,
  className,
  allowedViews,
}: ViewSwitcherProps) {
  const views = allowedViews
    ? ALL_VIEWS.filter((v) => allowedViews.includes(v.value))
    : ALL_VIEWS;

  const handleSelectChange = useCallback(
    (value: string) => {
      if (isViewType(value)) {
        if (allowedViews && !allowedViews.includes(value)) return;
        onViewChange(value);
      }
    },
    [allowedViews, onViewChange],
  );

  const activeMeta = views.find((v) => v.value === activeView) ?? views[0];

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <Select value={activeView} onValueChange={handleSelectChange}>
        <SelectTrigger
          className="h-9 w-fit min-w-0 shrink-0 gap-1 px-2 text-xs sm:min-w-[7.5rem]"
          aria-label="Select view"
        >
          <SelectValue placeholder={activeMeta?.label ?? "View"} />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {views.map((v) => {
            const AnimatedIcon = v.animatedIcon;
            const StaticIcon = v.staticIcon;
            return (
              <SelectItem key={v.value} value={v.value} className="text-xs">
                <span className="flex items-center gap-1.5">
                  {AnimatedIcon ? (
                    <AnimatedIcon size={14} className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : StaticIcon ? (
                    <StaticIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : null}
                  {v.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
});
