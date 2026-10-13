"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
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
const MENU_PX = 88;
const CLEAR_PX = 96;
const MOBILE_MAX_PX = 767;
const MINS = [SELECT_MIN_PX, SELECT_MIN_PX, SELECT_MIN_PX, SELECT_MIN_PX, DATE_MIN_PX];

interface FitPlan {
  taken: number;
  rowBreak: number;
}

function rowUsed(mins: readonly number[], start: number, count: number): number {
  let used = 0;
  for (let index = 0; index < count; index += 1) {
    const item = mins[start + index] ?? 0;
    used = used === 0 ? item : used + GAP_PX + item;
  }
  return used;
}

function takeFitting(mins: readonly number[], width: number, maxRows: number): FitPlan {
  const limit = Math.max(0, width);
  let rows = 1;
  let used = 0;
  let taken = 0;
  let rowBreak = 0;
  for (const item of mins) {
    const next = used === 0 ? item : used + GAP_PX + item;
    if (next <= limit) {
      used = next;
      taken += 1;
      if (rows === 1) rowBreak = taken;
      continue;
    }
    if (rows >= maxRows || item > limit) break;
    rows += 1;
    used = item;
    taken += 1;
  }
  return { taken, rowBreak: rowBreak || taken };
}

function fitTail(mins: readonly number[], width: number, packed: FitPlan, tail: number): FitPlan {
  const rowBreak = packed.rowBreak || packed.taken;
  let lastCount = packed.taken - rowBreak;
  const lastStart = rowBreak;
  if (lastCount <= 0) {
    let count = rowBreak;
    while (count > 0 && rowUsed(mins, 0, count) + GAP_PX + tail > width) count -= 1;
    return { taken: count, rowBreak: count };
  }
  while (lastCount > 0 && rowUsed(mins, lastStart, lastCount) + GAP_PX + tail > width) {
    lastCount -= 1;
  }
  if (lastCount > 0) return { taken: rowBreak + lastCount, rowBreak };
  let count = rowBreak;
  while (count > 0 && rowUsed(mins, 0, count) + GAP_PX + tail > width) count -= 1;
  return { taken: count, rowBreak: count };
}

function visiblePlan(width: number, maxRows: number, clear: boolean): FitPlan {
  if (width <= 0) return { taken: MINS.length, rowBreak: MINS.length };
  const packed = takeFitting(MINS, width, maxRows);
  const overflow = packed.taken < MINS.length;
  const tail = (overflow ? MENU_PX : 0) + (clear ? (overflow ? GAP_PX : 0) + CLEAR_PX : 0);
  if (tail === 0) return packed;
  return fitTail(MINS, width, packed, tail);
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
  const [box, setBox] = useState({ width: 0, mobile: false });

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const read = () => {
      setBox({
        width: node.clientWidth,
        mobile: window.innerWidth <= MOBILE_MAX_PX,
      });
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    const media = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    media.addEventListener("change", read);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", read);
    };
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

  const maxRows = box.mobile ? 2 : 1;
  const plan = visiblePlan(box.width, maxRows, props.isFiltered);
  const visible = slots.slice(0, plan.taken);
  const overflow = slots.slice(plan.taken);
  const breakAt = box.mobile ? Math.min(plan.rowBreak, visible.length) : visible.length;
  const firstRow = visible.slice(0, breakAt);
  const secondRow = visible.slice(breakAt);
  const menuOnSecond = secondRow.length > 0;

  const overflowMenu =
    overflow.length > 0 ? (
      <ResponsivePopover>
        <ResponsivePopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-9 shrink-0 px-3">
            Filters
          </Button>
        </ResponsivePopoverTrigger>
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
    <div ref={rootRef} className="flex w-full min-w-0 basis-full flex-col gap-2">
      {firstRow.length > 0 ? (
        <div className="flex w-full min-w-0 items-center gap-2">
          {firstRow.map((slot) => (
            <div key={slot.id} className={slotClass(slot.min)}>
              {slot.control}
            </div>
          ))}
          {menuOnSecond ? null : overflowMenu}
          {menuOnSecond ? null : clearButton}
        </div>
      ) : (
        <div className="flex w-full min-w-0 items-center gap-2">
          {overflowMenu}
          {clearButton}
        </div>
      )}
      {secondRow.length > 0 ? (
        <div className="flex w-full min-w-0 items-center gap-2">
          {secondRow.map((slot) => (
            <div key={slot.id} className={slotClass(slot.min)}>
              {slot.control}
            </div>
          ))}
          {overflowMenu}
          {clearButton}
        </div>
      ) : null}
    </div>
  );
}
