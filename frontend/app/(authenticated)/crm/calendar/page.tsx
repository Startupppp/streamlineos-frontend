"use client";

import { useState, useCallback, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CrmCalendarHeader } from "@/features/crm/calendar/crm-calendar-header";
import { CrmCalendarMonthView } from "@/features/crm/calendar/crm-calendar-month-view";
import { CrmCalendarWeekView } from "@/features/crm/calendar/crm-calendar-week-view";
import { CrmEventDialog } from "@/features/crm/calendar/crm-event-dialog";
import { CrmEventDetail } from "@/features/crm/calendar/crm-event-detail";
import {
  useCalendarEvents,
  useCalendarConnections,
  useCalendarOrgMembers,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";

const CRM_CATEGORIES = new Set(["meeting", "call", "demo", "general", "other"]);

function filterCrmEvents(events: CalendarListItem[]): CalendarListItem[] {
  return events.filter(
    (e) =>
      CRM_CATEGORIES.has(e.category) ||
      e.entityType === "LEAD" ||
      e.entityType === "DEAL" ||
      e.entityType === "CONTACT",
  );
}

export default function CrmCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarListItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarListItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [memberFilter, setMemberFilter] = useState("all");

  const rangeStart = useMemo(() => {
    if (view === "month") return startOfMonth(currentDate);
    return startOfWeek(currentDate, { weekStartsOn: 0 });
  }, [currentDate, view]);

  const rangeEnd = useMemo(() => {
    if (view === "month") return endOfMonth(currentDate);
    return endOfWeek(currentDate, { weekStartsOn: 0 });
  }, [currentDate, view]);

  const { data: connections, isLoading: connectionsLoading } = useCalendarConnections();
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(rangeStart, rangeEnd);
  const { data: members = [] } = useCalendarOrgMembers();

  const isConnected = useMemo(
    () => (connections ?? []).length > 0,
    [connections],
  );

  const filteredEvents = useMemo(() => filterCrmEvents(events), [events]);

  const weekStartDate = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 0 }),
    [currentDate],
  );

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => (view === "month" ? subMonths(d, 1) : subWeeks(d, 1)));
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => (view === "month" ? addMonths(d, 1) : addWeeks(d, 1)));
  }, [view]);

  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleViewChange = useCallback((v: "month" | "week") => setView(v), []);

  const handleMemberFilterChange = useCallback((id: string) => setMemberFilter(id), []);

  const handleConnectCalendar = useCallback(() => {
    window.open("/settings/integrations", "_self");
  }, []);

  const handleNewMeeting = useCallback(() => {
    setDefaultDate(null);
    setEditEvent(null);
    setCreateDialogOpen(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarListItem) => {
    setSelectedEvent(event);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setDefaultDate(date);
    setEditEvent(null);
    setCreateDialogOpen(true);
  }, []);

  const handleSlotClick = useCallback((date: Date) => {
    setDefaultDate(date);
    setEditEvent(null);
    setCreateDialogOpen(true);
  }, []);

  const handleDetailClose = useCallback(() => setSelectedEvent(null), []);

  const handleEditEvent = useCallback((event: CalendarListItem) => {
    setSelectedEvent(null);
    setEditEvent(event);
    setCreateDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) setEditEvent(null);
  }, []);

  const isLoading = connectionsLoading || eventsLoading;

  if (isLoading) {
    return (
      <PageWrapper title="Calendar" subtitle="Meetings, calls and scheduled activities" noInternalScroll>
        <div className="flex flex-col h-full gap-3">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-36 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-md" />
            </div>
          </div>
          <Skeleton className="flex-1 min-h-0 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Calendar"
      subtitle="Meetings, calls and scheduled activities"
      noInternalScroll
    >
      <div className="flex flex-col h-full gap-3">
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">
                Connect Google Calendar to see your meetings
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Events you create here are saved internally. Connect to sync with Google Calendar.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
              onClick={handleConnectCalendar}
            >
              Connect
            </Button>
          </motion.div>
        )}

        <div className="shrink-0">
          <CrmCalendarHeader
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            view={view}
            weekStartDate={weekStartDate}
            memberFilter={memberFilter}
            members={members}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onViewChange={handleViewChange}
            onMemberFilterChange={handleMemberFilterChange}
            onNewMeeting={handleNewMeeting}
          />
        </div>

        <div className="relative flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          {view === "month" && (
            <CrmCalendarMonthView
              year={currentDate.getFullYear()}
              month={currentDate.getMonth()}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}

          {view === "week" && (
            <CrmCalendarWeekView
              weekStartDate={weekStartDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
            />
          )}

          {filteredEvents.length === 0 && !eventsLoading && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="pointer-events-auto flex flex-col items-center gap-3 text-center bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl p-8 max-w-xs">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No events this period</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Schedule a meeting, call, or demo with your CRM contacts
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                  onClick={handleNewMeeting}
                >
                  Schedule a Meeting
                </Button>
              </div>
            </div>
          )}
        </div>

        <CrmEventDialog
          open={createDialogOpen}
          onOpenChange={handleDialogOpenChange}
          defaultDate={defaultDate}
          event={editEvent}
        />

        <CrmEventDetail
          event={selectedEvent}
          onClose={handleDetailClose}
          onEdit={handleEditEvent}
        />
      </div>
    </PageWrapper>
  );
}
