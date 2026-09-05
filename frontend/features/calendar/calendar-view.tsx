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
import {
  CalendarAgendaPreview,
  CalendarListFallback,
  CalendarOverlayFallback,
  CalendarSheetFallback,
} from "./calendar-lazy-fallbacks";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";
import { useCrmEventsVisible } from "./use-crm-calendar-events";
import { useCalendarSourceVisibility } from "./use-calendar-source-visibility";
import { useCalendarSourceDeepLink } from "./use-calendar-source-deeplink";
import { getErrorMessage } from "@/lib/get-error-message";
import { useFinalizeIntegrationConnection } from "@/hooks/api/integrations";
import { useCalendarConnections } from "./use-calendar-connections";
import {
  CalendarToolbar,
  CalendarToolbarPrimaryActions,
} from "./calendar-toolbar";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";
import { useCalendarComputed } from "./use-calendar-computed";
import { useCalendarViewState } from "./use-calendar-view-state";
import { useAfterLoad } from "@/hooks/common/use-after-load";

const CalendarGridLayer = dynamic(
  () =>
    import("./calendar-grid-layer").then((m) => ({
      default: m.CalendarGridLayer,
    })),
  { ssr: false, loading: () => <CalendarListFallback label="Loading calendar" /> },
);

const CalendarEventsPanel = dynamic(
  () =>
    import("./calendar-events-panel").then((m) => ({
      default: m.CalendarEventsPanel,
    })),
  { ssr: false, loading: () => <CalendarListFallback label="Loading events" /> },
);

const EventCreateDialog = dynamic(
  () =>
    import("./event-create-dialog").then((m) => ({
      default: m.EventCreateDialog,
    })),
  { ssr: false, loading: () => <CalendarOverlayFallback label="Loading event form" /> },
);

const CreateTicketFromCalendarDialog = dynamic(
  () =>
    import("./create-ticket-from-calendar-dialog").then((m) => ({
      default: m.CreateTicketFromCalendarDialog,
    })),
  { ssr: false, loading: () => <CalendarOverlayFallback label="Loading ticket form" /> },
);

const EventDetailSheet = dynamic(
  () =>
    import("./event-detail-sheet").then((m) => ({
      default: m.EventDetailSheet,
    })),
  { ssr: false, loading: () => <CalendarSheetFallback label="Loading event" /> },
);

const ExternalEventDetailSheet = dynamic(
  () =>
    import("./external-event-detail-sheet").then((m) => ({
      default: m.ExternalEventDetailSheet,
    })),
  { ssr: false, loading: () => <CalendarSheetFallback label="Loading event" /> },
);

const HrEventDetailSheet = dynamic(
  () =>
    import("./hr-event-detail-sheet").then((m) => ({
      default: m.HrEventDetailSheet,
    })),
  { ssr: false, loading: () => <CalendarSheetFallback label="Loading event" /> },
);

const CalendarAccountsSheet = dynamic(
  () =>
    import("./calendar-accounts-sheet").then((m) => ({
      default: m.CalendarAccountsSheet,
    })),
  { ssr: false, loading: () => <CalendarSheetFallback label="Loading calendar accounts" /> },
);

const NO_CALENDAR_EVENTS: CalendarListItem[] = [];
const NO_HR_EVENTS: import("./big-calendar-wrapper").BigCalEvent[] = [];

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
  const events = eventsResponse?.events ?? NO_CALENDAR_EVENTS;
  const sourceFailures = eventsResponse?.failures ?? [];
  const eventsTruncated = eventsResponse?.truncated ?? false;
  const { data: connections = [], isLoading: connectionsLoading } =
    useCalendarConnections();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);

  const activeConnectionCount = useMemo(
    () => connections.filter((c) => c.status === "active").length,
    [connections],
  );

  useCalendarSourceDeepLink();

  const afterLoad = useAfterLoad();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    if (mq.matches) {
      setIsMobile(true);
      setViewMode("list");
    }
  }, [setViewMode]);

  const { hiddenIds } = useCalendarAccountFilters();
  const { visible: hrEventsVisible, toggle: toggleHrEvents } = useCalendarSourceVisibility("hrEvents", true);
  const { visible: crmEventsVisible, toggle: toggleCrmEvents } = useCrmEventsVisible();
  const {
    visible: attendanceEventsVisible,
    toggle: toggleAttendanceEvents,
  } = useCalendarSourceVisibility("attendance", true);

  const [gridCalendarEvents, setGridCalendarEvents] = useState<CalendarListItem[]>([]);
  const handleGridCalendarEventsChange = useCallback(
    (evts: CalendarListItem[]) => setGridCalendarEvents(evts),
    [],
  );
  // External events take only the date range, so waiting for the connection
  // list before asking is a pure waterfall. Ask optimistically and stop only
  // once we know the org has no active connection.
  const { data: externalData } = useExternalCalendarEvents(
    rangeStart,
    rangeEnd,
    connectionsLoading || activeConnectionCount > 0,
  );

  const selectedEvent = useMemo<CalendarListItem | null>(
    () => {
      if (selectedEventId === null) return null;
      return (
        events.find((e) => e.id === selectedEventId) ??
        gridCalendarEvents.find((e) => e.id === selectedEventId) ??
        null
      );
    },
    [selectedEventId, events, gridCalendarEvents],
  );

  const { visibleEvents, visibleRange } = useCalendarComputed({
    events,
    externalData,
    hiddenIds,
    connections,
    currentDate,
    view,
    hrCalEvents: NO_HR_EVENTS,
    hrVisible: hrEventsVisible,
    crmVisible: crmEventsVisible,
    attendanceVisible: attendanceEventsVisible,
  });

  const handleRetryEvents = useCallback(() => { void refetchEvents(); }, [refetchEvents]);

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
                afterLoad ? (
                  <CalendarGridLayer
                    events={events}
                    externalData={externalData}
                    hiddenIds={hiddenIds}
                    connections={connections}
                    currentDate={currentDate}
                    view={view}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    hrEventsVisible={hrEventsVisible}
                    crmEventsVisible={crmEventsVisible}
                    attendanceEventsVisible={attendanceEventsVisible}
                    calHeight={calHeight}
                    onView={setView}
                    onNavigate={setCurrentDate}
                    onSelectSlot={
                      isCalendarOverlayOpen ? undefined : guardedSelectSlot
                    }
                    onSelectEvent={handleSelectEvent}
                    onCalendarEventsChange={handleGridCalendarEventsChange}
                  />
                ) : (
                  <CalendarAgendaPreview events={visibleEvents} />
                )
              ) : isMobile ? (
                <CalendarAgendaPreview events={visibleEvents} maxEvents={50} />
              ) : afterLoad ? (
                <CalendarEventsPanel
                  mode={viewMode}
                  events={visibleEvents}
                  range={viewMode === "list" ? visibleRange : undefined}
                  onSelectEvent={handleSelectEventById}
                />
              ) : (
                <CalendarAgendaPreview events={visibleEvents} maxEvents={20} />
              )}
            </div>
          </div>
        </div>

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

        {isCreateOpen && (
          <EventCreateDialog
            open
            onOpenChange={setIsCreateOpen}
            defaultSlot={createSlot}
          />
        )}

        {isCreateTicketOpen && (
          <CreateTicketFromCalendarDialog
            open
            onClose={handleCloseCreateTicket}
            defaultSlot={createTicketSlot}
          />
        )}

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

        {selectedEvent !== null && (
          <EventDetailSheet event={selectedEvent} onClose={handleCloseDetail} />
        )}
        {selectedExternal !== null && (
          <ExternalEventDetailSheet
            event={selectedExternal}
            onClose={handleCloseExternal}
          />
        )}
        {selectedHrEvent !== null && (
          <HrEventDetailSheet
            event={selectedHrEvent}
            onClose={handleCloseHrEvent}
          />
        )}
        {accountsOpen && (
          <CalendarAccountsSheet open onClose={handleCloseAccounts} />
        )}
      </div>
    </PageWrapper>
  );
}
