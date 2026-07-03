"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { format, endOfWeek } from "date-fns";

interface CrmCalendarHeaderProps {
  year: number;
  month: number;
  view: "month" | "week";
  weekStartDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: "month" | "week") => void;
}

export function CrmCalendarHeader({
  year,
  month,
  view,
  weekStartDate,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CrmCalendarHeaderProps) {
  function handleMonthView() {
    onViewChange("month");
  }

  function handleWeekView() {
    onViewChange("week");
  }

  const dateLabel =
    view === "month"
      ? format(new Date(year, month), "MMMM yyyy")
      : `${format(weekStartDate, "MMM d")} – ${format(
          endOfWeek(weekStartDate, { weekStartsOn: 1 }),
          "MMM d, yyyy",
        )}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onPrev}
          aria-label="Previous period"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onNext}
          aria-label="Next period"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" className="h-8 px-3 text-xs font-medium" onClick={onToday}>
          Today
        </Button>
        <div className="flex items-center gap-1.5 ml-1">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
        </div>
      </div>

      <div className="flex rounded-md border border-border overflow-hidden h-8">
        <button
          type="button"
          onClick={handleMonthView}
          className={`px-3 text-xs font-medium transition-colors ${
            view === "month"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          Month
        </button>
        <button
          type="button"
          onClick={handleWeekView}
          className={`px-3 text-xs font-medium transition-colors ${
            view === "week"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          Week
        </button>
      </div>
    </motion.div>
  );
}
