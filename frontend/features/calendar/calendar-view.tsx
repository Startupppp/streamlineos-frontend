"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  isSameDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Share2,
  Calendar as CalendarIcon,
  List,
  History,
  Users,
  Activity,
  PlusCircle,
  Sparkles,
  Ticket,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  useCalendarEvents,
  useCalendarOrgMembers,
  useExternalCalendarEvents,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { downloadCalendarExport } from "./calendar-export";
import { EventCreateDialog } from "./event-create-dialog";
import { EventDetailSheet } from "./event-detail-sheet";
import { CalendarAiAssistant } from "./calendar-ai-assistant";
import { CalendarEventsPanel } from "./calendar-events-panel";
import { CreateTicketFromCalendarDialog } from "./create-ticket-from-calendar-dialog";
import type { View, SlotInfo, BigCalEvent } from "./big-calendar-wrapper";
import { CalendarAccountsSheet } from "./calendar-accounts-sheet";
import { ExternalEventDetailSheet } from "./external-event-detail-sheet";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";
import { accountColor } from "./calendar-account-colors";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useFinalizeIntegrationConnection,
  useIntegrationConnections,
} from "@/hooks/api/integrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const BigCalendarWrapper = dynamic(
  () =>
    import("./big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false },
);

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#3b82f6",
};

const RSVP_BORDER_COLORS: Record<string, string> = {
  accepted: "#22c55e",
  declined: "#ef4444",
  tentative: "#f59e0b",
};

const CATEGORY_COLORS: Record<string, string> = {
  huddle: "#f97316",
};

export function CalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("week"); // Default to week view matching screenshot
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "history">(
    "calendar",
  );

  const calContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  useEffect(() => {
    const el = calContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const calHeight = Math.max(containerHeight + 200, 720);
  const [createSlot, setCreateSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSlotChoiceOpen, setIsSlotChoiceOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [createTicketSlot, setCreateTicketSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedExternal, setSelectedExternal] = useState<BigCalEvent | null>(
    null,
  );

  const rangeStart = useMemo(
    () => startOfMonth(subMonths(currentDate, 1)),
    [currentDate],
  );
  const rangeEnd = useMemo(
    () => endOfMonth(addMonths(currentDate, 1)),
    [currentDate],
  );

  const searchParams = useSearchParams();
  const { data: events = [], refetch: refetchEvents } = useCalendarEvents(
    rangeStart,
    rangeEnd,
  );
  const { data: members = [] } = useCalendarOrgMembers();
  const { data: connections = [] } = useIntegrationConnections();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const activeConnectionCount = connections.filter(
    (c) => c.status === "active",
  ).length;
  const { hiddenIds } = useCalendarAccountFilters();
  const { data: externalData } = useExternalCalendarEvents(
    rangeStart,
    rangeEnd,
    activeConnectionCount > 0,
  );

  // Active attendees filters
  const [checkedAttendees, setCheckedAttendees] = useState<
    Record<string, boolean>
  >({});
  useEffect(() => {
    if (members.length > 0) {
      const initial: Record<string, boolean> = {};
      members.forEach((m) => {
        initial[m.id] = true;
      });
      setCheckedAttendees(initial);
    }
  }, [members]);

  const selectedEvent = useMemo<CalendarListItem | null>(
    () =>
      selectedEventId !== null
        ? (events.find((e) => e.id === selectedEventId) ?? null)
        : null,
    [selectedEventId, events],
  );

  const calEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        allDay: e.allDay ?? false,
        resource: {
          color: e.color,
          category: e.category,
          description: e.description,
          location: e.location,
          source: e.source,
          myRsvpStatus: e.myRsvpStatus,
          entityType: e.entityType,
          entityId: e.entityId,
          projectId: e.projectId,
        },
      })),
    [events],
  );

  const externalCalEvents = useMemo(
    () =>
      (externalData?.events ?? [])
        .filter((e) => !hiddenIds.includes(e.connectionId))
        .map((e) => {
          const index = connections.findIndex((c) => c.id === e.connectionId);
          return {
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            allDay: e.allDay,
            resource: {
              source: "external",
              color: accountColor(index === -1 ? 0 : index),
              location: e.location,
              accountEmail: e.accountEmail,
              meetingUrl: e.meetingUrl,
              webLink: e.webLink,
              connectionId: e.connectionId,
              externalId: e.id,
            },
          };
        }),
    [externalData, hiddenIds, connections],
  );

  const allCalEvents = useMemo(
    () => [...calEvents, ...externalCalEvents],
    [calEvents, externalCalEvents],
  );

  // Filter today's activities for sidebar (internal events only)
  const todayActivities = useMemo(() => {
    return calEvents
      .filter((e) => isSameDay(e.start, currentDate))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [calEvents, currentDate]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setPendingSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsSlotChoiceOpen(true);
  }, []);

  const handleSlotChooseEvent = useCallback(() => {
    setIsSlotChoiceOpen(false);
    setCreateSlot(pendingSlot);
    setIsCreateOpen(true);
  }, [pendingSlot]);

  const handleSlotChooseTicket = useCallback(() => {
    setIsSlotChoiceOpen(false);
    setCreateTicketSlot(pendingSlot);
    setIsCreateTicketOpen(true);
  }, [pendingSlot]);

  const handleOpenCreate = useCallback(() => {
    setCreateSlot(null);
    setIsCreateOpen(true);
  }, []);

  const handleOpenCreateTicket = useCallback(() => {
    setCreateTicketSlot(null);
    setIsCreateTicketOpen(true);
  }, []);

  const handleSelectEvent = useCallback(
    (event: BigCalEvent) => {
      if (event.resource?.source === "external") {
        setSelectedExternal(event);
        return;
      }
      if (
        event.resource?.source === "task" &&
        event.resource.entityType === "ticket" &&
        event.resource.projectId != null &&
        event.resource.entityId != null
      ) {
        router.push(
          `/projects/${event.resource.projectId}?ticket=${event.resource.entityId}`,
        );
        return;
      }
      setSelectedEventId(String(event.id));
    },
    [router],
  );

  const eventPropGetter = useCallback((event: BigCalEvent) => {
    if (event.resource?.source === "external") {
      return {
        style: {
          backgroundColor: event.resource.color ?? "#3b82f6",
          opacity: 0.85,
          border: "none",
          borderRadius: "4px",
          color: "#fff",
          fontSize: "12px",
          padding: "1px 6px",
        },
      };
    }
    if (event.resource?.source === "task") {
      return {
        style: {
          backgroundColor: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          color: "var(--foreground)",
          fontSize: "11px",
          padding: "1px 6px",
        },
      };
    }
    const rsvp = event.resource?.myRsvpStatus as string | null | undefined;
    const rsvpBorderColor = rsvp ? (RSVP_BORDER_COLORS[rsvp] ?? null) : null;
    const categoryColor = event.resource?.category
      ? (CATEGORY_COLORS[event.resource.category] ?? null)
      : null;
    return {
      style: {
        backgroundColor:
          categoryColor ??
          EVENT_COLORS[event.resource?.color ?? "blue"] ??
          EVENT_COLORS.blue,
        border: "none",
        borderLeft: rsvpBorderColor ? `4px solid ${rsvpBorderColor}` : "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "12px",
        padding: rsvpBorderColor ? "1px 6px 1px 4px" : "1px 6px",
      },
    };
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return subMonths(d, 1);
      if (view === "week") return subWeeks(d, 1);
      return subDays(d, 1);
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return addMonths(d, 1);
      if (view === "week") return addWeeks(d, 1);
      return addDays(d, 1);
    });
  }, [view]);

  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleExport = useCallback(
    async (range: "month" | "3months" | "year") => {
      let from: Date;
      let to: Date;
      if (range === "month") {
        from = startOfMonth(currentDate);
        to = endOfMonth(currentDate);
      } else if (range === "3months") {
        from = startOfMonth(currentDate);
        to = endOfMonth(addMonths(currentDate, 2));
      } else {
        from = startOfYear(currentDate);
        to = endOfYear(currentDate);
      }
      const fromStr = format(from, "yyyy-MM-dd");
      const toStr = format(to, "yyyy-MM-dd");
      try {
        await downloadCalendarExport(fromStr, toStr);
      } catch {
        toast.error("Failed to export calendar");
      }
    },
    [currentDate],
  );

  const handleExportMonth = useCallback(() => {
    void handleExport("month");
  }, [handleExport]);
  const handleExport3Months = useCallback(() => {
    void handleExport("3months");
  }, [handleExport]);
  const handleExportYear = useCallback(() => {
    void handleExport("year");
  }, [handleExport]);

  const handleCloseDetail = useCallback(() => setSelectedEventId(null), []);

  const handleCloseExternal = useCallback(() => setSelectedExternal(null), []);

  const handleOpenAccounts = useCallback(() => setAccountsOpen(true), []);

  const handleCloseAccounts = useCallback(() => setAccountsOpen(false), []);

  const finalizeMutate = finalize.mutate;
  useEffect(() => {
    const connectedAccountId = searchParams.get("connected_account_id");
    if (!connectedAccountId) return;
    if (finalizeRef.current) return;
    finalizeRef.current = true;
    finalizeMutate(connectedAccountId, {
      onSuccess: (connection) => {
        toast.success(`${connection.accountEmail ?? "Account"} connected`);
        setAccountsOpen(true);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => router.replace("/calendar"),
    });
  }, [searchParams, finalizeMutate, router]);

  const formattedRange = useMemo(() => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    }
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const weekNumber = format(currentDate, "I"); // ISO Week Number
      if (start.getMonth() === end.getMonth()) {
        return `${format(currentDate, "MMMM yyyy")} Week ${weekNumber}`;
      }
      return `${format(start, "MMM")} - ${format(end, "MMM yyyy")} Week ${weekNumber}`;
    }
    return format(currentDate, "eeee, MMMM d, yyyy");
  }, [currentDate, view]);

  const visibleRange = useMemo(() => {
    if (view === "month") {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
    if (view === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
  }, [currentDate, view]);

  const handleSelectEventById = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Redesigned calendar header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0 select-none pb-2 border-b border-border">
        {/* Left header: Navigation, view selector & range label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Next"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={view} onValueChange={(v) => setView(v as View)}>
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
            onClick={handleToday}
          >
            Today
          </Button>

          <span className="text-sm font-semibold text-foreground ml-1">
            {formattedRange}
          </span>
        </div>

        {/* Right header actions: Share, Export, View mode, Add Event */}
        <div className="flex items-center gap-2">
          {/* Share dropdown */}
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

          {/* Export dropdown */}
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
              <DropdownMenuItem className="text-xs" onClick={handleExportMonth}>
                This month
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={handleExport3Months}
              >
                Next 3 months
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={handleExportYear}>
                This year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 relative"
            aria-label="Calendar accounts"
            onClick={handleOpenAccounts}
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
              <DropdownMenuItem className="text-xs" onClick={handleOpenCreate}>
                <Plus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Add event
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={handleOpenCreateTicket}
              >
                <Ticket className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Add ticket due date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 border-l border-border mx-1" />

          {/* View mode switcher */}
          <div className="flex rounded-md border overflow-hidden h-8">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
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
              onClick={() => setViewMode("list")}
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
              onClick={() => setViewMode("history")}
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

      {externalData?.errors && externalData.errors.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 shrink-0">
          <span className="text-[11px] text-amber-700 flex-1 min-w-0">
            {externalData.errors
              .map((e) => `${e.accountEmail ?? "Account"}: ${e.message}`)
              .join(" · ")}
          </span>
          <button
            type="button"
            onClick={handleOpenAccounts}
            className="text-[11px] text-amber-800 font-medium underline underline-offset-2 shrink-0 self-start sm:self-auto"
          >
            Manage accounts
          </button>
        </div>
      )}

      {/* Two column grid layout (Main area + Sidebar) */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left panel: main calendar wrapper */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            ref={calContainerRef}
            className={cn(
              "flex-1 min-h-0 rounded-lg border border-border bg-card calendar-container flex flex-col",
              viewMode === "calendar" && view === "month"
                ? "overflow-y-scroll"
                : "overflow-hidden",
            )}
          >
            {viewMode === "calendar" ? (
              <BigCalendarWrapper
                events={allCalEvents}
                date={currentDate}
                view={view}
                calHeight={calHeight}
                onView={setView}
                onNavigate={setCurrentDate}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventPropGetter}
              />
            ) : (
              <CalendarEventsPanel
                mode={viewMode}
                events={events}
                range={viewMode === "list" ? visibleRange : undefined}
                onSelectEvent={handleSelectEventById}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar panel */}
        <div className="w-[300px] shrink-0 border-l border-border px-3 space-y-5 hidden xl:block select-none overflow-y-auto">
          {/* Mini Monthly Picker */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Calendar
              mode="single"
              compact
              selected={currentDate}
              onSelect={(date) => date && setCurrentDate(date)}
              className="w-full"
            />
          </div>

          {/* Attendees Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-violet-500" />
                Attendees
              </span>
              <button
                onClick={handleOpenCreate}
                className="text-violet-600 hover:text-violet-700 flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="h-3 w-3" />
                Add
              </button>
            </div>
            <div className="rounded-lg border bg-card p-3 space-y-2.5 max-h-48 overflow-y-auto shadow-sm">
              {members.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  No members found
                </p>
              ) : (
                members.map((member) => {
                  const mName = member.firstName
                    ? `${member.firstName} ${member.lastName ?? ""}`.trim()
                    : (member.name ?? member.email);
                  const isChecked = checkedAttendees[member.id] !== false;
                  return (
                    <div key={member.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`attendee-check-${member.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setCheckedAttendees((prev) => ({
                            ...prev,
                            [member.id]: !!checked,
                          }));
                        }}
                      />
                      <label
                        htmlFor={`attendee-check-${member.id}`}
                        className="text-xs text-foreground cursor-pointer truncate font-medium flex-1 select-none"
                      >
                        {mName}
                      </label>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Today's Activities */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-violet-500" />
              My Activities
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {todayActivities.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No events scheduled for today
                </div>
              ) : (
                todayActivities.map((act) => {
                  const eventColor =
                    EVENT_COLORS[act.resource?.color ?? "blue"] ||
                    EVENT_COLORS.blue;
                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedEventId(String(act.id))}
                      className="rounded-lg border bg-card p-2.5 hover:bg-muted/40 cursor-pointer transition-all duration-200 shadow-xs border-l-4"
                      style={{ borderLeftColor: eventColor }}
                    >
                      <h5 className="text-xs font-semibold text-foreground truncate">
                        {act.title}
                      </h5>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {act.allDay
                          ? "All day"
                          : `${format(act.start, "h:mm a")} - ${format(act.end, "h:mm a")}`}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Sparkles launcher button for AI Chat */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-violet-600 hover:bg-violet-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-1.5 group select-none"
      >
        <Sparkles className="h-5 w-5 animate-pulse" />
        <span className="text-xs font-semibold pr-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap">
          Ask AI
        </span>
      </button>

      {/* Floating AI Assistant Chat panel */}
      <CalendarAiAssistant
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        onEventCreated={refetchEvents}
      />

      <EventCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultSlot={createSlot}
      />

      <CreateTicketFromCalendarDialog
        open={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        defaultSlot={createTicketSlot}
      />

      <Dialog open={isSlotChoiceOpen} onOpenChange={setIsSlotChoiceOpen}>
        <DialogContent className="max-w-xs p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              What would you like to create?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose the type of item to add for the selected time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Button
              variant="outline"
              className="justify-start h-8 text-xs gap-2"
              onClick={handleSlotChooseEvent}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              Calendar event
            </Button>
            <Button
              variant="outline"
              className="justify-start h-8 text-xs gap-2"
              onClick={handleSlotChooseTicket}
            >
              <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
              Ticket due date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EventDetailSheet event={selectedEvent} onClose={handleCloseDetail} />
      <ExternalEventDetailSheet
        event={selectedExternal}
        onClose={handleCloseExternal}
      />
      <CalendarAccountsSheet
        open={accountsOpen}
        onClose={handleCloseAccounts}
      />
    </div>
  );
}
