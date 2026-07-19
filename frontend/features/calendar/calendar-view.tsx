"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
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
import type { View, SlotInfo, BigCalEvent } from "./big-calendar-wrapper";
import { CalendarAccountsSheet } from "./calendar-accounts-sheet";
import { ExternalEventDetailSheet } from "./external-event-detail-sheet";
import { HrEventDetailSheet } from "./hr-event-detail-sheet";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";
import { useHrCalendarEventsMapped, useHrEventsVisible } from "./use-hr-calendar-events";
import { useCrmEventsVisible } from "./use-crm-calendar-events";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useFinalizeIntegrationConnection,
  useIntegrationConnections,
} from "@/hooks/api/integrations";
import {
  CalendarToolbar,
  CalendarToolbarPrimaryActions,
} from "./calendar-toolbar";
import { useEventPropGetter } from "./use-event-prop-getter";
import { useCalendarComputed } from "./use-calendar-computed";
import { useCalendarSlotSelectionGuard } from "./use-calendar-slot-selection-guard";

const BigCalendarWrapper = dynamic(
  () =>
    import("./big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false },
);

export function CalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
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

  const calHeight = useMemo(
    () => Math.max(containerHeight + 200, 720),
    [containerHeight],
  );

  const [createSlot, setCreateSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createParamConsumedRef = useRef(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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
  const [selectedHrEvent, setSelectedHrEvent] = useState<BigCalEvent | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);

  const rangeStart = useMemo(
    () => startOfMonth(subMonths(currentDate, 1)),
    [currentDate],
  );
  const rangeEnd = useMemo(
    () => endOfMonth(addMonths(currentDate, 1)),
    [currentDate],
  );

  const searchParams = useSearchParams();
  const { data: events = [] } = useCalendarEvents(
    rangeStart,
    rangeEnd,
  );
  const { data: connections = [] } = useIntegrationConnections();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);

  const activeConnectionCount = useMemo(
    () => connections.filter((c) => c.status === "active").length,
    [connections],
  );

  const { hiddenIds } = useCalendarAccountFilters();
  const { visible: hrEventsVisible, toggle: toggleHrEvents } = useHrEventsVisible();
  const { visible: crmEventsVisible, toggle: toggleCrmEvents } = useCrmEventsVisible();
  const { hrCalEvents } = useHrCalendarEventsMapped(rangeStart, rangeEnd);
  const { data: externalData } = useExternalCalendarEvents(
    rangeStart,
    rangeEnd,
    activeConnectionCount > 0,
  );

  const selectedEvent = useMemo<CalendarListItem | null>(
    () =>
      selectedEventId !== null
        ? (events.find((e) => e.id === selectedEventId) ?? null)
        : null,
    [selectedEventId, events],
  );

  const { allCalEvents, visibleRange } = useCalendarComputed({
    events,
    externalData,
    hiddenIds,
    connections,
    currentDate,
    view,
    hrCalEvents,
    hrVisible: hrEventsVisible,
    crmVisible: crmEventsVisible,
  });

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setPendingSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsSlotChoiceOpen(true);
  }, []);

  const isCalendarOverlayOpen =
    isCreateOpen ||
    isSlotChoiceOpen ||
    isCreateTicketOpen ||
    accountsOpen ||
    selectedEventId !== null ||
    selectedExternal !== null ||
    selectedHrEvent !== null;

  const guardedSelectSlot = useCalendarSlotSelectionGuard(
    handleSelectSlot,
    isCalendarOverlayOpen,
  );

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
      if (event.resource?.source === "hr") {
        setSelectedHrEvent(event);
        return;
      }
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

  const eventPropGetter = useEventPropGetter();

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

  const handleCloseDetail = useCallback(() => setSelectedEventId(null), []);
  const handleCloseExternal = useCallback(() => setSelectedExternal(null), []);
  const handleCloseHrEvent = useCallback(() => setSelectedHrEvent(null), []);
  const handleOpenAccounts = useCallback(() => setAccountsOpen(true), []);
  const handleCloseAccounts = useCallback(() => setAccountsOpen(false), []);
  const handleCloseCreateTicket = useCallback(
    () => setIsCreateTicketOpen(false),
    [],
  );
  const handleSelectEventById = useCallback(
    (eventId: string) => setSelectedEventId(eventId),
    [],
  );
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
  }, [searchParams, finalizeMutate, router]);

  useEffect(() => {
    if (createParamConsumedRef.current) return;
    if (searchParams.get("create") !== "1") return;
    createParamConsumedRef.current = true;
    setCreateSlot(null);
    setIsCreateOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    router.replace(`/calendar${next.size > 0 ? `?${next.toString()}` : ""}`);
  }, [searchParams, router]);

  return (
    <PageWrapper
      title="Calendar"
      noInternalScroll
      actionsInline
      actions={
        <CalendarToolbarPrimaryActions
          onOpenCreate={handleOpenCreate}
          onOpenCreateTicket={handleOpenCreateTicket}
        />
      }
    >
      <div className="flex h-full flex-col gap-3">
        <CalendarToolbar
          view={view}
          viewMode={viewMode}
          currentDate={currentDate}
          activeConnectionCount={activeConnectionCount}
          hrEventsVisible={hrEventsVisible}
          crmEventsVisible={crmEventsVisible}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onDateChange={setCurrentDate}
          onViewChange={setView}
          onViewModeChange={setViewMode}
          onOpenAccounts={handleOpenAccounts}
          onOpenCreate={handleOpenCreate}
          onOpenCreateTicket={handleOpenCreateTicket}
          onToggleHrEvents={toggleHrEvents}
          onToggleCrmEvents={toggleCrmEvents}
          hidePrimaryActions
        />

        {externalData?.errors && externalData.errors.length > 0 && (
          <div className="flex shrink-0 flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-500/30 dark:bg-amber-500/10 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 text-[11px] text-amber-700 dark:text-amber-300">
              {externalData.errors
                .map((e) => `${e.accountEmail ?? "Account"}: ${e.message}`)
                .join(" · ")}
            </span>
            <button
              type="button"
              onClick={handleOpenAccounts}
              className="shrink-0 self-start text-[11px] font-medium text-amber-800 underline underline-offset-2 dark:text-amber-300 sm:self-auto"
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
                  events={events}
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

