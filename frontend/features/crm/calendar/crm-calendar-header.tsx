"use client";

import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { format, endOfWeek } from "date-fns";


interface CrmCalendarHeaderProps {
  year: number;
  month: number;
  view: "month" | "week";
  weekStartDate: Date;
  memberFilter: string;
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: "month" | "week") => void;
  onMemberFilterChange: (memberId: string) => void;
  onNewMeeting: () => void;
}

export function CrmCalendarHeader({
  year,
  month,
  view,
  weekStartDate,
  memberFilter,
  members,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onMemberFilterChange,
  onNewMeeting,
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
          "MMM d, yyyy"
        )}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-3 text-sm" onClick={onToday}>
          Today
        </Button>
        <div className="flex items-center gap-1.5 ml-1">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={memberFilter} onValueChange={onMemberFilterChange}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All Members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name ?? member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={onNewMeeting}
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" />
            New Meeting
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
