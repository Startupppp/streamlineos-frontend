"use client";

import { memo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Share2,
  Calendar as CalendarIcon,
  List,
  History,
  Link2,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { View } from "./big-calendar-wrapper";

interface CalendarToolbarProps {
  view: View;
  viewMode: "calendar" | "list" | "history";
  formattedRange: string;
  activeConnectionCount: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: View) => void;
  onViewModeChange: (v: "calendar" | "list" | "history") => void;
  onExportMonth: () => void;
  onExport3Months: () => void;
  onExportYear: () => void;
  onOpenAccounts: () => void;
  onOpenCreate: () => void;
  onOpenCreateTicket: () => void;
}

export const CalendarToolbar = memo(function CalendarToolbar({
  view,
  viewMode,
  formattedRange,
  activeConnectionCount,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onViewModeChange,
  onExportMonth,
  onExport3Months,
  onExportYear,
  onOpenAccounts,
  onOpenCreate,
  onOpenCreateTicket,
}: CalendarToolbarProps) {
  const handleViewChange = useCallback(
    (v: string) => onViewChange(v as View),
    [onViewChange],
  );
  const handleCalendarMode = useCallback(
    () => onViewModeChange("calendar"),
    [onViewModeChange],
  );
  const handleListMode = useCallback(
    () => onViewModeChange("list"),
    [onViewModeChange],
  );
  const handleHistoryMode = useCallback(
    () => onViewModeChange("history"),
    [onViewModeChange],
  );

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 shrink-0 select-none pb-2 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous"
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next"
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={view} onValueChange={handleViewChange}>
          <SelectTrigger className="h-8 w-[95px] text-xs font-medium">
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

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium px-3"
          onClick={onToday}
        >
          Today
        </Button>

        <span className="text-sm font-semibold text-foreground ml-1">
          {formattedRange}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium gap-1 px-3"
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium gap-1 px-3"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">
              Export to CSV
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onClick={onExportMonth}>
              This month
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={onExport3Months}>
              Next 3 months
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={onExportYear}>
              This year
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 relative"
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white gap-1"
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

        <div className="flex rounded-md border overflow-hidden h-8">
          <button
            type="button"
            onClick={handleCalendarMode}
            aria-pressed={viewMode === "calendar"}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === "calendar"
                ? "bg-muted text-foreground"
                : "hover:bg-muted/40 text-muted-foreground",
            )}
            title="Calendar View"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleListMode}
            aria-pressed={viewMode === "list"}
            className={cn(
              "p-1.5 transition-colors border-l",
              viewMode === "list"
                ? "bg-muted text-foreground"
                : "hover:bg-muted/40 text-muted-foreground",
            )}
            title="List View"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleHistoryMode}
            aria-pressed={viewMode === "history"}
            className={cn(
              "p-1.5 transition-colors border-l",
              viewMode === "history"
                ? "bg-muted text-foreground"
                : "hover:bg-muted/40 text-muted-foreground",
            )}
            title="History"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
