"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from "date-fns";
import { Plus, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import {
  useCalendarEvents,
  useExternalCalendarEvents,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { EventCreateDialog } from "./event-create-dialog";
import { EventDetailSheet } from "./event-detail-sheet";
import { CalendarEventsPanel } from "./calendar-events-panel";
import { CreateTicketFromCalendarDialog } from "./create-ticket-from-calendar-dialog";
import { CalendarAccountsSheet } from "./calendar-accounts-sheet";
import { ExternalEventDetailSheet } from "./external-event-detail-sheet";
import { HrEventDetailSheet } from "./hr-event-detail-sheet";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";
import { useHrCalendarEventsMapped, useHrEventsVisible } from "./use-hr-calendar-events";
import { useCrmEventsVisible } from "./use-crm-calendar-events";
import { useCalendarSourceVisibility } from "./use-calendar-source-visibility";
import { useAttendanceCalendarEvents } from "./use-attendance-calendar-events";
import { getErrorMessage } from "@/lib/get-error-message";
import { useFinalizeIntegrationConnection } from "@/hooks/api/integrations";
import { useCalendarConnections } from "./use-calendar-connections";
import {
  CalendarToolbar,
  CalendarToolbarPrimaryActions,
} from "./calendar-toolbar";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";
import { useEventPropGetter } from "./use-event-prop-getter";
import { useCalendarComputed } from "./use-calendar-computed";
import { useCalendarViewState } from "./use-calendar-view-state";

const BigCalendarWrapper = dynamic(
  () =>
    import("./big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false },
);

export function CalendarView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentDate,
    setCurrentDate,
    view,
    setView,
    viewMode,
    setViewMode,
    calContainerRef,
    calHeight,
    createSlot,
    isCreateOpen,
    setIsCreateOpen,
    selectedEventId,
    isSlotChoiceOpen,
    setIsSlotChoiceOpen,
    isCreateTicketOpen,
    createTicketSlot,
    selectedExternal,
    selectedHrEvent,
    accountsOpen,
    setAccountsOpen,
    isCalendarOverlayOpen,
    guardedSelectSlot,
    handleSlotChooseEvent,
    handleSlotChooseTicket,
    handleOpenCreate,
    handleOpenCreateTicket,
    handleSelectEvent,
    handlePrev,
    handleNext,
    handleToday,
    handleCloseDetail,
    handleCloseExternal,
    handleCloseHrEvent,
    handleOpenAccounts,
    handleCloseAccounts,
    handleCloseCreateTicket,
    handleSelectEventById,
  } = useCalendarViewState();

  const rangeStart = useMemo(
    () => startOfMonth(subMonths(currentDate, 1)),
    [currentDate],
  );
  const rangeEnd = useMemo(
    () => endOfMonth(addMonths(currentDate, 1)),
    [currentDate],
  );

  const {
    data: eventsResponse,
    isError: eventsIsError,
    error: eventsError,
    refetch: refetchEvents,
  } = useCalendarEvents(rangeStart, rangeEnd);
  const events = eventsResponse?.events ?? [];
  const sourceFailures = eventsResponse?.failures ?? [];
  const eventsTruncated = eventsResponse?.truncated ?? false;
  const { data: connections = [] } = useCalendarConnections();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);

  const activeConnectionCount = useMemo(
    () => connections.filter((c) => c.status === "active").length,
    [connections],
  );

  const { hiddenIds } = useCalendarAccountFilters();
  const { visible: hrEventsVisible, toggle: toggleHrEvents } = useHrEventsVisible();
  const { visible: crmEventsVisible, toggle: toggleCrmEvents } = useCrmEventsVisible();
  const {
    visible: attendanceEventsVisible,
    toggle: toggleAttendanceEvents,
  } = useCalendarSourceVisibility("attendance", true);
  const { hrCalEvents } = useHrCalendarEventsMapped(rangeStart, rangeEnd, hrEventsVisible);
  const selfAttendanceEvents = useAttendanceCalendarEvents(rangeStart, rangeEnd, attendanceEventsVisible);
  const calendarEvents = useMemo(() => {
    const aggregateAttendanceDates = new Set(
      events
        .filter((event) => event.source === "attendance")
        .map((event) => format(new Date(event.start), "yyyy-MM-dd")),
    );
    return [
      ...events,
      ...selfAttendanceEvents.filter(
        (event) =>
          !aggregateAttendanceDates.has(
            format(new Date(event.start), "yyyy-MM-dd"),
          ),
      ),
    ];
  }, [events, selfAttendanceEvents]);
  const { data: externalData } = useExternalCalendarEvents(
    rangeStart,
    rangeEnd,
    activeConnectionCount > 0,
  );

  const selectedEvent = useMemo<CalendarListItem | null>(
    () =>
      selectedEventId !== null
        ? (calendarEvents.find((e) => e.id === selectedEventId) ?? null)
        : null,
    [selectedEventId, calendarEvents],
  );

  const { allCalEvents, visibleEvents, visibleRange } = useCalendarComputed({
    events: calendarEvents,
    externalData,
    hiddenIds,
    connections,
    currentDate,
    view,
    hrCalEvents,
    hrVisible: hrEventsVisible,
    crmVisible: crmEventsVisible,
    attendanceVisible: attendanceEventsVisible,
  });

  const handleRetryEvents = useCallback(() => { void refetchEvents(); }, [refetchEvents]);
  const eventPropGetter = useEventPropGetter();

  const finalizeMutate = finalize.mutate;
  useEffect(() => {
    const connectedAccountId =
      searchParams.get("connected_account_id") ??
      searchParams.get("connectedAccountId");
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
  }, [searchParams, finalizeMutate, router, setAccountsOpen]);

  return (
    <PageWrapper
      title={
        <CalendarMonthYearPicker
          currentDate={currentDate}
          title={format(currentDate, "MMMM yyyy")}
          onDateChange={setCurrentDate}
        />
      }
      noInternalScroll
      actionsInline
      actions={
        <CalendarToolbarPrimaryActions
          activeConnectionCount={activeConnectionCount}
          onOpenAccounts={handleOpenAccounts}
          onOpenCreate={handleOpenCreate}
          onOpenCreateTicket={handleOpenCreateTicket}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <CalendarToolbar
          view={view}
          viewMode={viewMode}
          hrEventsVisible={hrEventsVisible}
          crmEventsVisible={crmEventsVisible}
          attendanceEventsVisible={attendanceEventsVisible}
          sourceFailures={sourceFailures}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onViewChange={setView}
          onViewModeChange={setViewMode}
          onOpenCreate={handleOpenCreate}
          onOpenCreateTicket={handleOpenCreateTicket}
          onToggleHrEvents={toggleHrEvents}
          onToggleCrmEvents={toggleCrmEvents}
          onToggleAttendanceEvents={toggleAttendanceEvents}
          hidePrimaryActions
        />

        {eventsIsError && (
          <div className="flex shrink-0 flex-col gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-1.5 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 text-dense text-status-warning-ink">
              {getErrorMessage(eventsError)}
            </span>
            <button
              type="button"
              onClick={handleRetryEvents}
              className="shrink-0 self-start text-dense font-medium text-status-warning-ink underline underline-offset-2 sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        {eventsTruncated && (
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-1.5">
            <span className="min-w-0 flex-1 text-dense text-status-warning-ink">
              Too many events in this period — only the first 2,000 are shown. Switch to a shorter range to see all events.
            </span>
          </div>
        )}

        {externalData?.errors && externalData.errors.length > 0 && (
          <div className="flex shrink-0 flex-col gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-1.5 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 text-dense text-status-warning-ink">
              {externalData.errors
                .map((e) => `${e.accountEmail ?? "Account"}: ${e.message}`)
                .join(" · ")}
            </span>
            <button
              type="button"
              onClick={handleOpenAccounts}
              className="shrink-0 self-start text-dense font-medium text-status-warning-ink underline underline-offset-2 sm:self-auto"
            >
              Manage accounts
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              ref={calContainerRef}
              className={cn(
                "calendar-container flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card",
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
                  onSelectSlot={
                    isCalendarOverlayOpen ? undefined : guardedSelectSlot
                  }
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={eventPropGetter}
                />
              ) : (
                <CalendarEventsPanel
                  mode={viewMode}
                  events={visibleEvents}
                  range={viewMode === "list" ? visibleRange : undefined}
                  onSelectEvent={handleSelectEventById}
                />
              )}
            </div>
          </div>
        </div>

        <EventCreateDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          defaultSlot={createSlot}
        />

        <CreateTicketFromCalendarDialog
          open={isCreateTicketOpen}
          onClose={handleCloseCreateTicket}
          defaultSlot={createTicketSlot}
        />

        <Dialog open={isSlotChoiceOpen} onOpenChange={setIsSlotChoiceOpen}>
          <DialogContent
            className="max-w-none p-4 md:max-w-xs"
            showCloseButton={false}
          >
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
                className="h-8 justify-start gap-2 text-xs"
                onClick={handleSlotChooseEvent}
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                Calendar event
              </Button>
              <Button
                variant="outline"
                className="h-8 justify-start gap-2 text-xs"
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
        <HrEventDetailSheet
          event={selectedHrEvent}
          onClose={handleCloseHrEvent}
        />
        <CalendarAccountsSheet
          open={accountsOpen}
          onClose={handleCloseAccounts}
        />
      </div>
    </PageWrapper>
  );
}
