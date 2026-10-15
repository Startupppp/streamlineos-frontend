"use client";

import { memo, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { setMonth, setYear } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const YEARS_PER_PAGE = 12;

type PickerMode = "month" | "year";

function getYearRangeStart(year: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
}

interface MonthButtonProps {
  label: string;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

function MonthButton({ label, index, isSelected, onSelect }: MonthButtonProps) {
  const handleClick = useCallback(() => onSelect(index), [index, onSelect]);
  return (
    <Button
      type="button"
      variant={isSelected ? "default" : "ghost"}
      onClick={handleClick}
      className={cn(
        "h-9 w-full text-xs font-medium",
        !isSelected && "text-foreground",
      )}
    >
      {label}
    </Button>
  );
}

interface YearButtonProps {
  year: number;
  isSelected: boolean;
  isCurrentYear: boolean;
  onSelect: (year: number) => void;
}

function YearButton({ year, isSelected, isCurrentYear, onSelect }: YearButtonProps) {
  const handleClick = useCallback(() => onSelect(year), [year, onSelect]);
  return (
    <Button
      type="button"
      variant={isSelected ? "default" : "ghost"}
      onClick={handleClick}
      className={cn(
        "h-9 w-full text-xs font-medium tabular-nums",
        !isSelected && (isCurrentYear ? "bg-muted text-foreground" : "text-foreground"),
      )}
    >
      {year}
    </Button>
  );
}

interface CalendarMonthYearPickerProps {
  currentDate: Date;
  title: string;
  onDateChange: (date: Date) => void;
}

function subscribeToNothing() {
  return () => {};
}

function PeriodAnnouncement({ title }: { title: string }) {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const announcement = (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {`Showing ${title}`}
    </span>
  );

  if (!isClient) return announcement;
  return createPortal(announcement, document.body);
}

export const CalendarMonthYearPicker = memo(function CalendarMonthYearPicker({
  currentDate,
  title,
  onDateChange,
}: CalendarMonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("month");
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [yearRangeStart, setYearRangeStart] = useState(() =>
    getYearRangeStart(currentDate.getFullYear()),
  );

  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();

  const yearOptions = useMemo(
    () =>
      Array.from(
        { length: YEARS_PER_PAGE },
        (_, index) => yearRangeStart + index,
      ),
    [yearRangeStart],
  );

  const yearRangeEnd = yearRangeStart + YEARS_PER_PAGE - 1;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        const year = currentDate.getFullYear();
        setPickerYear(year);
        setYearRangeStart(getYearRangeStart(year));
        setPickerMode("month");
      }
      setOpen(nextOpen);
    },
    [currentDate],
  );

  const handleMonthSelect = useCallback(
    (monthIndex: number) => {
      onDateChange(setMonth(setYear(currentDate, pickerYear), monthIndex));
      setOpen(false);
    },
    [currentDate, onDateChange, pickerYear],
  );

  const handleYearSelect = useCallback((year: number) => {
    setPickerYear(year);
    setPickerMode("month");
  }, []);

  const handleShowYearPicker = useCallback(() => {
    setYearRangeStart(getYearRangeStart(pickerYear));
    setPickerMode("year");
  }, [pickerYear]);

  const handlePrevYear = useCallback(() => {
    setPickerYear((year) => year - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setPickerYear((year) => year + 1);
  }, []);

  const handlePrevYearRange = useCallback(() => {
    setYearRangeStart((start) => start - YEARS_PER_PAGE);
  }, []);

  const handleNextYearRange = useCallback(() => {
    setYearRangeStart((start) => start + YEARS_PER_PAGE);
  }, []);

  return (
    <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
      <PeriodAnnouncement title={title} />
      <ResponsivePopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-fit shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-left text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={`Choose month and year, currently ${title}`}
        >
          {title}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent className="w-64 p-3" align="start" title="Choose month and year">
        {pickerMode === "month" ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <AnimatedIconButton
                icon={ChevronLeftIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="w-7"
                aria-label="Previous year"
                onClick={handlePrevYear}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={handleShowYearPicker}
                className="rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Select year, currently ${pickerYear}`}
              >
                {pickerYear}
              </Button>
              <AnimatedIconButton
                icon={ChevronRightIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="w-7"
                aria-label="Next year"
                onClick={handleNextYear}
              />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((label, index) => (
                <MonthButton
                  key={label}
                  label={label}
                  index={index}
                  isSelected={index === selectedMonth && pickerYear === selectedYear}
                  onSelect={handleMonthSelect}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <AnimatedIconButton
                icon={ChevronLeftIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="w-7"
                aria-label="Previous years"
                onClick={handlePrevYearRange}
              />
              <span className="text-sm font-semibold tabular-nums">
                {yearRangeStart} – {yearRangeEnd}
              </span>
              <AnimatedIconButton
                icon={ChevronRightIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="w-7"
                aria-label="Next years"
                onClick={handleNextYearRange}
              />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {yearOptions.map((year) => (
                <YearButton
                  key={year}
                  year={year}
                  isSelected={year === pickerYear}
                  isCurrentYear={year === selectedYear}
                  onSelect={handleYearSelect}
                />
              ))}
            </div>
          </>
        )}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
});
