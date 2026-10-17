"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontalIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import type { BuildFilterOption } from "@/features/build/shared/build-filter-select";
import {
  INITIATIVE_STATUS_OPTIONS,
  PERIOD_OPTIONS,
} from "./use-managed-product-overview";

interface ManagedProductOverviewFiltersProps {
  rawPeriod: string | null;
  teamSelectValue: string;
  initiativeStatus: string;
  segmentSelectValue: string;
  teamOptions: readonly BuildFilterOption[];
  segmentOptions: readonly BuildFilterOption[];
  from: string | undefined;
  to: string | undefined;
  isFiltered: boolean;
  onPeriodChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onInitiativeStatusChange: (value: string) => void;
  onSegmentChange: (value: string) => void;
  onDateRangeChange: (range: { from: string; to: string }) => void;
  onClearFilters: () => void;
}

const SELECT_MIN_PX = 160;
const DATE_MIN_PX = 240;
const GAP_PX = 8;
const MENU_PX = 36;
const CLEAR_PX = 96;
const MINS = [SELECT_MIN_PX, SELECT_MIN_PX, SELECT_MIN_PX, SELECT_MIN_PX, DATE_MIN_PX];

interface FitPlan {
  taken: number;
}

function rowUsed(mins: readonly number[], start: number, count: number): number {
  let used = 0;
  for (let index = 0; index < count; index += 1) {
    const item = mins[start + index] ?? 0;
    used = used === 0 ? item : used + GAP_PX + item;
  }
  return used;
}

function takeFitting(mins: readonly number[], width: number): FitPlan {
  const limit = Math.max(0, width);
  let used = 0;
  let taken = 0;
  for (const item of mins) {
    const next = used === 0 ? item : used + GAP_PX + item;
    if (next <= limit) {
      used = next;
      taken += 1;
      continue;
    }
    break;
  }
  return { taken };
}

function fitTail(mins: readonly number[], width: number, packed: FitPlan, tail: number): FitPlan {
  let count = packed.taken;
  while (count > 0 && rowUsed(mins, 0, count) + GAP_PX + tail > width) count -= 1;
  return { taken: count };
}

function visiblePlan(width: number, clear: boolean): FitPlan {
  if (width <= 0) return { taken: MINS.length };
  const packed = takeFitting(MINS, width);
  const withClear = clear ? fitTail(MINS, width, packed, CLEAR_PX) : packed;
  if (withClear.taken === MINS.length) return withClear;
  const overflowTail = MENU_PX + (clear ? GAP_PX + CLEAR_PX : 0);
  return fitTail(MINS, width, withClear, overflowTail);
}

interface FilterSlot {
  id: string;
  min: number;
  control: ReactNode;
}

function slotClass(min: number): string {
  return cn("min-w-0 flex-1", min === DATE_MIN_PX ? "md:min-w-60" : "md:min-w-40");
}

export function ManagedProductOverviewFilters(props: ManagedProductOverviewFiltersProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const read = () => setWidth(node.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const slots: FilterSlot[] = [
    {
      id: "period",
      min: SELECT_MIN_PX,
      control: (
        <BuildFilterSelect
          label="Period"
          value={props.rawPeriod ?? "all"}
          onValueChange={props.onPeriodChange}
          options={PERIOD_OPTIONS}
          className="w-full min-w-0 max-w-none md:w-full md:min-w-0 md:max-w-none"
        />
      ),
    },
    {
      id: "team",
      min: SELECT_MIN_PX,
      control: (
        <BuildFilterSelect
          label="Team"
          value={props.teamSelectValue}
          onValueChange={props.onTeamChange}
          options={props.teamOptions}
          className="w-full min-w-0 max-w-none md:w-full md:min-w-0 md:max-w-none"
        />
      ),
    },
    {
      id: "status",
      min: SELECT_MIN_PX,
      control: (
        <BuildFilterSelect
          label="Status"
          value={props.initiativeStatus}
          onValueChange={props.onInitiativeStatusChange}
          options={INITIATIVE_STATUS_OPTIONS}
          className="w-full min-w-0 max-w-none md:w-full md:min-w-0 md:max-w-none"
        />
      ),
    },
    {
      id: "segment",
      min: SELECT_MIN_PX,
      control: (
        <BuildFilterSelect
          label="Segment"
          value={props.segmentSelectValue}
          onValueChange={props.onSegmentChange}
          options={props.segmentOptions}
          className="w-full min-w-0 max-w-none md:w-full md:min-w-0 md:max-w-none"
        />
      ),
    },
    {
      id: "date",
      min: DATE_MIN_PX,
      control: (
        <DateRangePicker
          from={props.from}
          to={props.to}
          onChange={props.onDateRangeChange}
          className="w-full min-w-0 max-w-none whitespace-nowrap"
        />
      ),
    },
  ];

  const plan = visiblePlan(width, props.isFiltered);
  const visible = slots.slice(0, plan.taken);
  const overflow = slots.slice(plan.taken);

  const overflowMenu =
    overflow.length > 0 ? (
      <ResponsivePopover>
        <Tooltip>
          <TooltipTrigger asChild>
            <ResponsivePopoverTrigger asChild>
              <AnimatedIconButton
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                aria-label="More filters"
                icon={SlidersHorizontalIcon}
                iconSize={16}
              />
            </ResponsivePopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>More filters</TooltipContent>
        </Tooltip>
        <ResponsivePopoverContent
          title="Filters"
          align="end"
          showHeader
          className="flex w-72 flex-col gap-2 p-3"
        >
          {overflow.map((slot) => (
            <div key={slot.id} className="w-full min-w-0">
              {slot.control}
            </div>
          ))}
        </ResponsivePopoverContent>
      </ResponsivePopover>
    ) : null;

  const clearButton = props.isFiltered ? (
    <Button
      type="button"
      variant="ghost"
      className="h-9 shrink-0 px-3"
      onClick={props.onClearFilters}
    >
      Clear all
    </Button>
  ) : null;

  return (
    <div ref={rootRef} className="flex w-full min-w-0 basis-full flex-nowrap items-center gap-2">
      {visible.map((slot) => (
        <div key={slot.id} className={slotClass(slot.min)}>
          {slot.control}
        </div>
      ))}
      {overflowMenu}
      {clearButton}
    </div>
  );
}
