"use client";

import { memo, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  Calendar as CalendarIcon,
  List,
  History,
  Link2,
  Ticket,
  Building2,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { View } from "./big-calendar-wrapper";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";

type ViewMode = "calendar" | "list" | "history";

const VIEW_MODE_OPTIONS: ViewOption<ViewMode>[] = [
  { value: "calendar", icon: CalendarIcon, label: "Calendar View" },
  { value: "list", icon: List, label: "List View" },
  { value: "history", icon: History, label: "History" },
];

interface CalendarToolbarProps {
  view: View;
  viewMode: ViewMode;
  currentDate: Date;
  activeConnectionCount: number;
  hrEventsVisible: boolean;
  crmEventsVisible: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange: (date: Date) => void;
  onViewChange: (v: View) => void;
  onViewModeChange: (v: ViewMode) => void;
  onOpenAccounts: () => void;
  onOpenCreate: () => void;
  onOpenCreateTicket: () => void;
  onToggleHrEvents: () => void;
  onToggleCrmEvents: () => void;
}

export const CalendarToolbar = memo(function CalendarToolbar({
  view,
  viewMode,
  currentDate,
  activeConnectionCount,
  hrEventsVisible,
  crmEventsVisible,
  onPrev,
  onNext,
  onToday,
  onDateChange,
  onViewChange,
  onViewModeChange,
  onOpenAccounts,
  onOpenCreate,
  onOpenCreateTicket,
  onToggleHrEvents,
  onToggleCrmEvents,
}: CalendarToolbarProps) {
  const handleViewChange = useCallback(
    (v: string) => onViewChange(v as View),
    [onViewChange],
  );

  const navTitle = useMemo(() => {
    if (view === "day") return format(currentDate, "MMMM d, yyyy");
    return format(currentDate, "MMMM yyyy");
  }, [currentDate, view]);

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 shrink-0 select-none pb-2 border-b border-border">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="outline"
          size="sm"
          className="text-xs font-medium px-3 shrink-0"
          onClick={onToday}
        >
          Today
        </Button>

        <div className="flex items-center shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="w-8 rounded-r-none border-r-0"
            aria-label="Previous"
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 rounded-l-none"
            aria-label="Next"
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <CalendarMonthYearPicker
          currentDate={currentDate}
          title={navTitle}
          onDateChange={onDateChange}
        />
      </div>

      <div className="flex items-center gap-2">
        <Select value={view} onValueChange={handleViewChange}>
          <SelectTrigger className="w-[95px] text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day" className="text-xs">
              Day
            </SelectItem>
            <SelectItem value="week" className="text-xs">
              Week
            </SelectItem>
            <SelectItem value="month" className="text-xs">
              Month
            </SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium gap-1 px-3"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Share</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 text-xs">
            <DropdownMenuItem className="text-xs">Copy link</DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Email calendar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Embed calendar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          className="w-8 relative"
          aria-label="Calendar accounts"
          onClick={onOpenAccounts}
        >
          <Link2 className="h-3.5 w-3.5" />
          {activeConnectionCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] rounded-full bg-primary px-0.5 text-[9px] font-semibold leading-[14px] text-primary-foreground text-center">
              {activeConnectionCount}
            </span>
          )}
        </Button>

        <Button
          variant={hrEventsVisible ? "secondary" : "outline"}
          size="sm"
          className="text-xs font-medium gap-1 px-3"
          aria-label={hrEventsVisible ? "Hide HR events" : "Show HR events"}
          onClick={onToggleHrEvents}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">HR events</span>
        </Button>

        <Button
          variant={crmEventsVisible ? "secondary" : "outline"}
          size="sm"
          className="text-xs font-medium gap-1 px-3"
          aria-label={crmEventsVisible ? "Hide CRM events" : "Show CRM events"}
          onClick={onToggleCrmEvents}
        >
          <Handshake className="h-3.5 w-3.5" />
          <span className="hidden md:inline">CRM events</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="text-xs" onClick={onOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Add event
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={onOpenCreateTicket}>
              <Ticket className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Add ticket due date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 border-l border-border mx-1" />

        <ViewToggle<ViewMode>
          value={viewMode}
          options={VIEW_MODE_OPTIONS}
          onChange={onViewModeChange}
          size="sm"
        />
      </div>
    </div>
  );
});

