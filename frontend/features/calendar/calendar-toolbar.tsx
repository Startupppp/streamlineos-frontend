"use client";

import { memo, useCallback } from "react";
import {
  Share2,
  Calendar as CalendarIcon,
  List,
  History,
  Link2,
  Ticket,
  Building2,
  Handshake,
  Clock3,
} from "lucide-react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  PlusIcon,
} from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import type { View } from "./big-calendar-wrapper";

type ViewMode = "calendar" | "list" | "history";

const VIEW_MODE_OPTIONS: ViewOption<ViewMode>[] = [
  { value: "calendar", icon: CalendarIcon, label: "Calendar View" },
  { value: "list", icon: List, label: "List View" },
  { value: "history", icon: History, label: "History" },
];

interface CalendarToolbarPrimaryActionsProps {
  activeConnectionCount: number;
  onOpenAccounts: () => void;
  onOpenCreate: () => void;
  onOpenCreateTicket: () => void;
}

function ShareMenuItems() {
  return (
    <>
      <DropdownMenuItem className="text-xs">Copy link</DropdownMenuItem>
      <DropdownMenuItem className="text-xs">Email calendar</DropdownMenuItem>
      <DropdownMenuItem className="text-xs">Embed calendar</DropdownMenuItem>
    </>
  );
}

export const CalendarToolbarPrimaryActions = memo(
  function CalendarToolbarPrimaryActions({
    activeConnectionCount,
    onOpenAccounts,
    onOpenCreate,
    onOpenCreateTicket,
  }: CalendarToolbarPrimaryActionsProps) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 px-3 text-xs font-medium"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 text-xs">
            <ShareMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          className="relative w-8"
          aria-label="Calendar accounts"
          onClick={onOpenAccounts}
        >
          <Link2 className="h-3.5 w-3.5" />
          {activeConnectionCount > 0 ? (
            <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] rounded-full bg-primary px-0.5 text-center text-[9px] font-semibold leading-[14px] text-primary-foreground">
              {activeConnectionCount}
            </span>
          ) : null}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-0"
              size="sm"
              className="gap-1 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <span className="hidden sm:inline">Add</span>
            </AnimatedIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="text-xs" onClick={onOpenCreate}>
              <PlusIcon size={14} className="mr-2 text-muted-foreground" />
              Add event
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={onOpenCreateTicket}>
              <Ticket className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Add ticket due date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
);

interface CalendarToolbarProps {
  view: View;
  viewMode: ViewMode;
  hrEventsVisible: boolean;
  crmEventsVisible: boolean;
  attendanceEventsVisible: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: View) => void;
  onViewModeChange: (v: ViewMode) => void;
  onOpenCreate: () => void;
  onOpenCreateTicket: () => void;
  onToggleHrEvents: () => void;
  onToggleCrmEvents: () => void;
  onToggleAttendanceEvents: () => void;
  hidePrimaryActions?: boolean;
}

export const CalendarToolbar = memo(function CalendarToolbar({
  view,
  viewMode,
  hrEventsVisible,
  crmEventsVisible,
  attendanceEventsVisible,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onViewModeChange,
  onOpenCreate,
  onOpenCreateTicket,
  onToggleHrEvents,
  onToggleCrmEvents,
  onToggleAttendanceEvents,
  hidePrimaryActions = false,
}: CalendarToolbarProps) {
  const handleViewChange = useCallback(
    (v: string) => onViewChange(v as View),
    [onViewChange],
  );

  return (
    <div className="flex w-full min-w-0 shrink-0 select-none flex-row items-center justify-between gap-2 border-b border-border pb-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 px-2.5 text-xs font-medium sm:px-3"
          onClick={onToday}
        >
          Today
        </Button>

        <div className="flex shrink-0 items-center">
          <AnimatedIconButton
            icon={ChevronLeftIcon}
            iconSize={16}
            variant="outline"
            size="icon"
            className="w-8 rounded-r-none border-r-0"
            aria-label="Previous"
            onClick={onPrev}
          />
          <AnimatedIconButton
            icon={ChevronRightIcon}
            iconSize={16}
            variant="outline"
            size="icon"
            className="w-8 rounded-l-none"
            aria-label="Next"
            onClick={onNext}
          />
        </div>

      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Select value={view} onValueChange={handleViewChange}>
          <SelectTrigger
            className={cn(
              "h-8 w-fit min-w-[4.5rem] text-xs font-medium",
              FILTER_SELECT_TRIGGER,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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

        <div className="hidden items-center gap-1.5 lg:flex sm:gap-2">
          {!hidePrimaryActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 px-3 text-xs font-medium"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Share</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <ShareMenuItems />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <Button
            variant={attendanceEventsVisible ? "secondary" : "outline"}
            size="sm"
            className="gap-1 px-2.5 text-xs font-medium xl:px-3"
            aria-label={
              attendanceEventsVisible
                ? "Hide attendance events"
                : "Show attendance events"
            }
            onClick={onToggleAttendanceEvents}
          >
            <Clock3 className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Attendance</span>
          </Button>

          <Button
            variant={hrEventsVisible ? "secondary" : "outline"}
            size="sm"
            className="gap-1 px-2.5 text-xs font-medium xl:px-3"
            aria-label={hrEventsVisible ? "Hide HR events" : "Show HR events"}
            onClick={onToggleHrEvents}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">HR events</span>
          </Button>

          <Button
            variant={crmEventsVisible ? "secondary" : "outline"}
            size="sm"
            className="gap-1 px-2.5 text-xs font-medium xl:px-3"
            aria-label={
              crmEventsVisible ? "Hide CRM events" : "Show CRM events"
            }
            onClick={onToggleCrmEvents}
          >
            <Handshake className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">CRM events</span>
          </Button>
        </div>

        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton
                icon={EllipsisIcon}
                iconSize={16}
                variant="outline"
                size="icon"
                className="w-8"
                aria-label="More calendar actions"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              {!hidePrimaryActions ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    <Share2 className="mr-2 h-3.5 w-3.5" />
                    Share
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40 text-xs">
                    <ShareMenuItems />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                className="text-xs"
                checked={attendanceEventsVisible}
                onCheckedChange={onToggleAttendanceEvents}
              >
                Attendance
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="text-xs"
                checked={hrEventsVisible}
                onCheckedChange={onToggleHrEvents}
              >
                HR events
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="text-xs"
                checked={crmEventsVisible}
                onCheckedChange={onToggleCrmEvents}
              >
                CRM events
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!hidePrimaryActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton
                icon={PlusIcon}
                iconSize={14}
                iconClassName="mr-0"
                size="sm"
                className="gap-1 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <span className="hidden sm:inline">Add</span>
              </AnimatedIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="text-xs" onClick={onOpenCreate}>
                <PlusIcon size={14} className="mr-2 text-muted-foreground" />
                Add event
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={onOpenCreateTicket}
              >
                <Ticket className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                Add ticket due date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <div className="mx-0.5 hidden h-4 border-l border-border sm:block" />

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
