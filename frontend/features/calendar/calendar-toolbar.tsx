"use client";

import { memo, useCallback, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Share2,
  Calendar as CalendarIcon,
  List,
  History,
  Link2,
  Building2,
  Handshake,
  Clock3,
  ListTodo,
} from "lucide-react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  PlusIcon,
} from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import type { ViewOption } from "@/components/ui/view-toggle";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import type { View } from "./big-calendar-wrapper";
import {
  CalendarSourcePanel,
  SourceFailureBanner,
} from "./calendar-source-panel";

type ViewMode = "calendar" | "list" | "history" | "my-day";

const VIEW_PERIOD_LABEL: Record<View, string> = {
  day: "day",
  week: "week",
  work_week: "work week",
  month: "month",
  agenda: "period",
};

const NO_SOURCE_FAILURES: ReadonlyArray<{ key: string; label: string }> = [];
const TOOL_ROW_EASE = [0.22, 1, 0.36, 1] as const;
const OUTLINE_CONTROL_CLASS = "bg-card data-[state=open]:border-primary";

const VIEW_MODE_OPTIONS: ViewOption<ViewMode>[] = [
  { value: "calendar", icon: CalendarIcon, label: "Calendar View" },
  { value: "list", icon: List, label: "List View" },
  { value: "history", icon: History, label: "History" },
  { value: "my-day", icon: ListTodo, label: "My Day" },
];

function parseViewMode(value: string): ViewMode {
  return (
    VIEW_MODE_OPTIONS.find((option) => option.value === value)?.value ??
    "calendar"
  );
}

interface CalendarToolbarPrimaryActionsProps {
  activeConnectionCount: number;
  onOpenAccounts: () => void;
  onOpenBookingPages: () => void;
  onOpenCreate: () => void;
}

function AddEventButton({ onOpenCreate }: { onOpenCreate: () => void }) {
  return (
    <AnimatedIconButton
      icon={PlusIcon}
      iconSize={14}
      iconClassName="mr-0"
      size="sm"
      aria-label="Add to calendar"
      className="gap-1 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
      onClick={onOpenCreate}
    >
      <span className="hidden sm:inline">Add</span>
    </AnimatedIconButton>
  );
}

export const CalendarToolbarPrimaryActions = memo(
  function CalendarToolbarPrimaryActions({
    activeConnectionCount,
    onOpenAccounts,
    onOpenBookingPages,
    onOpenCreate,
  }: CalendarToolbarPrimaryActionsProps) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className={OUTLINE_CONTROL_CLASS}
          aria-label="Booking pages"
          onClick={onOpenBookingPages}
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className={cn("relative", OUTLINE_CONTROL_CLASS)}
          aria-label="Calendar accounts"
          onClick={onOpenAccounts}
        >
          <Link2 className="h-3.5 w-3.5" />
          {activeConnectionCount > 0 ? (
            <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] rounded-full bg-primary px-0.5 text-center text-micro font-semibold leading-[14px] text-primary-foreground">
              {activeConnectionCount}
            </span>
          ) : null}
        </Button>

        <AddEventButton onOpenCreate={onOpenCreate} />
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
  isHrEnabled: boolean;
  isCrmEnabled: boolean;
  isAttendanceEnabled: boolean;
  sourceFailures?: ReadonlyArray<{ key: string; label: string }>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: View) => void;
  onViewModeChange: (v: ViewMode) => void;
  onOpenCreate: () => void;
  onToggleHrEvents: () => void;
  onToggleCrmEvents: () => void;
  onToggleAttendanceEvents: () => void;
  onOpenCapacity?: () => void;
  onOpenCoach?: () => void;
  onOpenScenario?: () => void;
  scenarioCount?: number;
  hidePrimaryActions?: boolean;
  navigationDisabled?: boolean;
  filters?: ReactNode;
}

export const CalendarToolbar = memo(function CalendarToolbar({
  view,
  viewMode,
  hrEventsVisible,
  crmEventsVisible,
  attendanceEventsVisible,
  isHrEnabled,
  isCrmEnabled,
  isAttendanceEnabled,
  sourceFailures,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onViewModeChange,
  onOpenCreate,
  onToggleHrEvents,
  onToggleCrmEvents,
  onToggleAttendanceEvents,
  onOpenCapacity,
  onOpenCoach,
  onOpenScenario,
  scenarioCount = 0,
  hidePrimaryActions = false,
  navigationDisabled = false,
  filters,
}: CalendarToolbarProps) {
  const handleViewChange = useCallback(
    (v: string) => onViewChange(v as View),
    [onViewChange],
  );
  const handleViewModeValueChange = useCallback(
    (value: string) => onViewModeChange(parseViewMode(value)),
    [onViewModeChange],
  );
  const reduceMotion = useReducedMotion() === true;
  const showDateNav = viewMode === "calendar";
  const showCapacity = viewMode === "calendar" && Boolean(onOpenCapacity);
  const showInsights =
    (viewMode === "calendar" || viewMode === "my-day") && Boolean(onOpenCoach);

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col gap-2">
      <div className="flex min-w-0 select-none flex-col gap-2 border-b border-border pb-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <Tabs
            value={viewMode}
            onValueChange={handleViewModeValueChange}
            className="min-w-0 gap-0"
          >
            <TabsList aria-label="Calendar modes">
              {VIEW_MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <TabsTrigger key={option.value} value={option.value}>
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{option.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {showCapacity ? (
              <Button
                variant="outline"
                size="sm"
                className={cn("shrink-0 px-2.5", OUTLINE_CONTROL_CLASS)}
                onClick={onOpenCapacity}
              >
                Capacity
              </Button>
            ) : null}
            {showInsights ? (
              <Button
                variant="outline"
                size="sm"
                className={cn("shrink-0 px-2.5", OUTLINE_CONTROL_CLASS)}
                aria-label="My time insights"
                onClick={onOpenCoach}
              >
                <span className="sm:hidden">Insights</span>
                <span className="hidden sm:inline">My time insights</span>
              </Button>
            ) : null}
            <div className="hidden items-center gap-1.5 lg:flex sm:gap-2">
              {isAttendanceEnabled ? (
                <Button
                  variant={attendanceEventsVisible ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "gap-1 px-2.5 xl:px-3",
                    !attendanceEventsVisible && OUTLINE_CONTROL_CLASS,
                  )}
                  aria-label="Attendance events"
                  aria-pressed={attendanceEventsVisible}
                  onClick={onToggleAttendanceEvents}
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Attendance</span>
                </Button>
              ) : null}

              {isHrEnabled ? (
                <Button
                  variant={hrEventsVisible ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "gap-1 px-2.5 xl:px-3",
                    !hrEventsVisible && OUTLINE_CONTROL_CLASS,
                  )}
                  aria-label="HR events"
                  aria-pressed={hrEventsVisible}
                  onClick={onToggleHrEvents}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">HR events</span>
                </Button>
              ) : null}

              {isCrmEnabled ? (
                <Button
                  variant={crmEventsVisible ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "gap-1 px-2.5 xl:px-3",
                    !crmEventsVisible && OUTLINE_CONTROL_CLASS,
                  )}
                  aria-label="CRM events"
                  aria-pressed={crmEventsVisible}
                  onClick={onToggleCrmEvents}
                >
                  <Handshake className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">CRM events</span>
                </Button>
              ) : null}

              <CalendarSourcePanel failures={sourceFailures} />
            </div>

            <div className="flex items-center gap-1.5 lg:hidden">
              <CalendarSourcePanel failures={sourceFailures} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AnimatedIconButton
                    icon={EllipsisIcon}
                    iconSize={16}
                    variant="outline"
                    size="icon"
                    className={OUTLINE_CONTROL_CLASS}
                    aria-label="More calendar actions"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {isAttendanceEnabled ? (
                    <DropdownMenuCheckboxItem
                      checked={attendanceEventsVisible}
                      onCheckedChange={onToggleAttendanceEvents}
                    >
                      Attendance
                    </DropdownMenuCheckboxItem>
                  ) : null}
                  {isHrEnabled ? (
                    <DropdownMenuCheckboxItem
                      checked={hrEventsVisible}
                      onCheckedChange={onToggleHrEvents}
                    >
                      HR events
                    </DropdownMenuCheckboxItem>
                  ) : null}
                  {isCrmEnabled ? (
                    <DropdownMenuCheckboxItem
                      checked={crmEventsVisible}
                      onCheckedChange={onToggleCrmEvents}
                    >
                      CRM events
                    </DropdownMenuCheckboxItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {!hidePrimaryActions ? (
              <AddEventButton onOpenCreate={onOpenCreate} />
            ) : null}
          </div>
        </div>

        <motion.div
          key={viewMode}
          className="flex min-h-9 min-w-0 flex-wrap items-center gap-1.5 sm:gap-2"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: TOOL_ROW_EASE }
          }
        >
          {showDateNav ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className={cn("shrink-0 px-2.5 sm:px-3", OUTLINE_CONTROL_CLASS)}
                onClick={onToday}
                disabled={navigationDisabled}
                aria-keyshortcuts="T"
                title="Today (T)"
              >
                Today
              </Button>
              <div
                role="group"
                aria-label="Date navigation"
                className="flex shrink-0 items-center"
              >
                <AnimatedIconButton
                  icon={ChevronLeftIcon}
                  iconSize={16}
                  variant="outline"
                  size="icon"
                  className={cn("rounded-r-none border-r-0", OUTLINE_CONTROL_CLASS)}
                  aria-label={`Previous ${VIEW_PERIOD_LABEL[view]}`}
                  aria-keyshortcuts="ArrowLeft"
                  title={`Previous ${VIEW_PERIOD_LABEL[view]} (←)`}
                  disabled={navigationDisabled}
                  onClick={onPrev}
                />
                <AnimatedIconButton
                  icon={ChevronRightIcon}
                  iconSize={16}
                  variant="outline"
                  size="icon"
                  className={cn("rounded-l-none", OUTLINE_CONTROL_CLASS)}
                  aria-label={`Next ${VIEW_PERIOD_LABEL[view]}`}
                  aria-keyshortcuts="ArrowRight"
                  title={`Next ${VIEW_PERIOD_LABEL[view]} (→)`}
                  disabled={navigationDisabled}
                  onClick={onNext}
                />
              </div>
              <Select value={view} onValueChange={handleViewChange}>
                <SelectTrigger
                  aria-label="Calendar view"
                  className={cn(
                    "w-fit min-w-[4.5rem] bg-card",
                    FILTER_SELECT_TRIGGER,
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : viewMode === "history" ? (
            <span className="px-1 text-sm text-muted-foreground">
              Newest to oldest
            </span>
          ) : null}
          {viewMode === "calendar" && scenarioCount > 0 && onOpenScenario ? (
            <Button
              variant="outline"
              size="sm"
              className={cn("shrink-0 px-2.5", OUTLINE_CONTROL_CLASS)}
              onClick={onOpenScenario}
            >
              What if ({scenarioCount})
            </Button>
          ) : null}
          {filters}
        </motion.div>
      </div>

      <SourceFailureBanner failures={sourceFailures ?? NO_SOURCE_FAILURES} />
    </div>
  );
});
