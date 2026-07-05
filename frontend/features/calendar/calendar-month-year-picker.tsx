"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { setMonth, setYear } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface CalendarMonthYearPickerProps {
  currentDate: Date;
  title: string;
  onDateChange: (date: Date) => void;
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
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-lg font-normal text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label="Choose month and year"
        >
          {title}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {pickerMode === "month" ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Previous year"
                onClick={handlePrevYear}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={handleShowYearPicker}
                className="rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Select year, currently ${pickerYear}`}
              >
                {pickerYear}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Next year"
                onClick={handleNextYear}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((label, index) => {
                const isSelected =
                  index === selectedMonth && pickerYear === selectedYear;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleMonthSelect(index)}
                    className={cn(
                      "rounded-md py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Previous years"
                onClick={handlePrevYearRange}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold tabular-nums">
                {yearRangeStart} – {yearRangeEnd}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Next years"
                onClick={handleNextYearRange}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {yearOptions.map((year) => {
                const isSelected = year === pickerYear;
                const isCurrentYear = year === selectedYear;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleYearSelect(year)}
                    className={cn(
                      "rounded-md py-2 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isCurrentYear
                          ? "bg-muted text-foreground"
                          : "text-foreground hover:bg-muted",
                    )}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});
