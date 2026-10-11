"use client";

import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PM_TOOLBAR } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface GanttToolbarProps {
  displayMonth: number;
  displayYear: number;
  yearOptions: number[];
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onPrevWeek: () => void;
  onResetWeek: () => void;
  onNextWeek: () => void;
}

export function GanttToolbar({
  displayMonth,
  displayYear,
  yearOptions,
  onMonthChange,
  onYearChange,
  onPrevWeek,
  onResetWeek,
  onNextWeek,
}: GanttToolbarProps) {
  return (
    <div className={cn(PM_TOOLBAR, "gap-2")}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Select value={String(displayMonth)} onValueChange={onMonthChange}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(displayYear)} onValueChange={onYearChange}>
          <SelectTrigger className="w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <AnimatedIconButton
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onPrevWeek}
          aria-label="Previous week"
          icon={ChevronLeftIcon}
        />
        <Button
          variant="outline"
          size="sm"
          className="px-2.5 text-xs"
          onClick={onResetWeek}
        >
          Today
        </Button>
        <AnimatedIconButton
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={onNextWeek}
          aria-label="Next week"
          icon={ChevronRightIcon}
        />
      </div>
    </div>
  );
}
