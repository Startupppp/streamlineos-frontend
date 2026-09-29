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
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { VIEW_TYPES, isViewType, type ViewType } from "@/lib/build/view-types";

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
  const ActiveAnimatedIcon = activeMeta?.animatedIcon;
  const ActiveStaticIcon = activeMeta?.staticIcon;

  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <Select value={activeView} onValueChange={handleSelectChange}>
        <SelectTrigger
          className={cn(
            FILTER_SELECT_TRIGGER,
            "size-9 shrink-0 justify-center gap-0 px-0 sm:h-9 sm:w-fit sm:min-w-[7.5rem] sm:justify-between sm:gap-1 sm:px-2",
          )}
          aria-label="Select view"
        >
          <span className="inline-flex items-center gap-1.5 sm:hidden">
            {ActiveAnimatedIcon ? (
              <ActiveAnimatedIcon size={14} className="h-3.5 w-3.5" />
            ) : ActiveStaticIcon ? (
              <ActiveStaticIcon className="h-3.5 w-3.5" />
            ) : null}
            <span className="sr-only">{activeMeta?.label ?? "View"}</span>
          </span>
          <span className="hidden min-w-0 sm:inline-flex">
            <SelectValue
              placeholder={activeMeta?.label ?? "View"}
              className="font-normal"
            />
          </span>
        </SelectTrigger>
        <SelectContent className="min-w-[10rem]">
          {views.map((v) => {
            const AnimatedIcon = v.animatedIcon;
            const StaticIcon = v.staticIcon;
            return (
              <SelectItem key={v.value} value={v.value} className="font-normal">
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
