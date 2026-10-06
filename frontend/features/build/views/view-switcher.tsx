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
import { VIEW_TYPES, type ViewType } from "@/lib/build/view-types";

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

type ViewMeta = {
  animatedIcon?: AnimatedViewIcon;
  staticIcon?: StaticViewIcon;
  label: string;
};

const VIEW_META: Record<ViewType, ViewMeta> = {
  board: { animatedIcon: LayoutGridIcon, label: "Board" },
  list: { animatedIcon: LayoutListIcon, label: "List" },
  table: { staticIcon: Table2, label: "Table" },
  calendar: { staticIcon: Calendar, label: "Calendar" },
  timeline: { animatedIcon: ChartBarIcon, label: "Timeline" },
  workload: { animatedIcon: UsersIcon, label: "Workload" },
};

const ALL_VIEWS = VIEW_TYPES.map((value) => ({ value, ...VIEW_META[value] }));

export const ViewSwitcher = memo(function ViewSwitcher({
  activeView,
  onViewChange,
  className,
  allowedViews,
}: ViewSwitcherProps) {
  const views = allowedViews
    ? ALL_VIEWS.filter((v) => allowedViews.includes(v.value))
    : ALL_VIEWS;

  const handleSelect = useCallback(
    (value: ViewType) => {
      if (allowedViews && !allowedViews.includes(value)) return;
      onViewChange(value);
    },
    [allowedViews, onViewChange],
  );

  return (
    <div
      role="group"
      aria-label="Select view"
      className={cn(
        "inline-flex h-9 max-w-full items-center gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-input bg-card p-1 scrollbar-hide",
        className,
      )}
    >
      {views.map((v) => {
        const AnimatedIcon = v.animatedIcon;
        const StaticIcon = v.staticIcon;
        const isActive = v.value === activeView;
        function onClick() {
          handleSelect(v.value);
        }
        return (
          <button
            key={v.value}
            type="button"
            onClick={onClick}
            aria-label={v.label}
            aria-pressed={isActive}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium leading-none transition-colors press-scale outline-none motion-reduce:transition-none",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {AnimatedIcon ? (
              <AnimatedIcon size={14} className="h-3.5 w-3.5" />
            ) : StaticIcon ? (
              <StaticIcon className="h-3.5 w-3.5" />
            ) : null}
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
});
