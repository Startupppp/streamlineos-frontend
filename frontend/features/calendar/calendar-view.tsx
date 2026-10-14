"use client";

import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfDay,
  addDays,
  differenceInCalendarDays,
  format,
} from "date-fns";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import {
  useCalendarEvents,
  useCalendarHistory,
  useExternalCalendarEvents,
  useCalendarSources,
} from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import type { CalendarSearchResponse } from "@/hooks/api/calendar-types";
import {
  CalendarAgendaPreview,
  CalendarListFallback,
  CalendarLoadingStatus,
  CalendarSheetFallback,
} from "./calendar-lazy-fallbacks";
import { CALENDAR_TRUNCATED_WARNING } from "./calendar-event-constants";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";
import { useCalendarSourceDeepLink } from "./use-calendar-source-deeplink";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { usePermissionGate } from "@/hooks/api/access";
import { useFinalizeIntegrationConnection } from "@/hooks/api/integrations";
import { useCalendarConnections } from "./use-calendar-connections";
import {
  CalendarToolbar,
  CalendarToolbarPrimaryActions,
} from "./calendar-toolbar";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";
import {
  calendarSourceFamily,
  filterCalendarEventsBySources,
  mergeSelfAttendanceEvents,
  toBigCalEvent,
  useCalendarComputed,
} from "./use-calendar-computed";
import { useAttendanceCalendarEvents } from "./use-attendance-calendar-events";
import { useCalendarViewState } from "./use-calendar-view-state";
import { useAfterLoad } from "@/hooks/common/use-after-load";
import { useShellVariant } from "@/components/layout/shell-variant-context";
import { calendarUrl } from "./calendar-url-state";
import { useCalendarSearch } from "@/hooks/api/calendar-search";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { CalendarMyDayPanel } from "./calendar-my-day-panel";
import { useCalendarSavedViews } from "@/hooks/api/calendar-saved-views";
import {
  calendarSavedViewGridView,
  calendarSavedViewWindow,
} from "./calendar-saved-view-date";
import { CalendarSavedViewControls } from "./calendar-saved-view-controls";
import { calendarSearchIsPartial } from "./calendar-search-coverage";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { CalendarOfflinePanel } from "./calendar-offline-panel";
import { CalendarOfflineIntentReview } from "./calendar-offline-intent-review";
import { CalendarOfflineEditReview } from "./calendar-offline-edit-review";
import type {
  CalendarOfflineEditIntent,
  CalendarOfflineIntent,
} from "./calendar-offline-intent";
import type { CalendarScenarioDraftStep } from "./calendar-scenario-draft";

const CalendarGridLayer = dynamic(
  () =>
    import("./calendar-grid-layer").then((m) => ({
      default: m.CalendarGridLayer,
    })),
  {
    ssr: false,
    loading: () => <CalendarListFallback label="Loading calendar" />,
  },
);

const CalendarEventsPanel = dynamic(
  () =>
    import("./calendar-events-panel").then((m) => ({
      default: m.CalendarEventsPanel,
    })),
  {
    ssr: false,
    loading: () => <CalendarListFallback label="Loading events" />,
  },
);

const loadEventCreateDialog = () =>
  import("./event-create-dialog").then((module) => ({
    default: module.EventCreateDialog,
  }));

const EventCreateDialog = dynamic(loadEventCreateDialog, { ssr: false });

const EventDetailSheet = dynamic(
  () =>
    import("./event-detail-sheet").then((m) => ({
      default: m.EventDetailSheet,
    })),
  {
    ssr: false,
    loading: () => <CalendarSheetFallback label="Loading event" />,
  },
);

const ExternalEventDetailSheet = dynamic(
  () =>
    import("./external-event-detail-sheet").then((m) => ({
      default: m.ExternalEventDetailSheet,
    })),
  {
    ssr: false,
    loading: () => <CalendarSheetFallback label="Loading event" />,
  },
);

const HrEventDetailSheet = dynamic(
  () =>
    import("./hr-event-detail-sheet").then((m) => ({
      default: m.HrEventDetailSheet,
    })),
  {
    ssr: false,
    loading: () => <CalendarSheetFallback label="Loading event" />,
  },
);

const CalendarAccountsSheet = dynamic(
  () =>
    import("./calendar-accounts-sheet").then((m) => ({
      default: m.CalendarAccountsSheet,
    })),
  {
    ssr: false,
    loading: () => <CalendarSheetFallback label="Loading calendar accounts" />,
  },
);

const CalendarCoachSheet = dynamic(
  () =>
    import("./calendar-coach-sheet").then((module) => ({
      default: module.CalendarCoachSheet,
    })),
  {
    ssr: false,
    loading: () => <CalendarSheetFallback label="Loading personal insights" />,
  },
);

const CalendarCapacitySheet = dynamic(
  () =>
    import("./calendar-capacity-sheet").then((module) => ({
      default: module.CalendarCapacitySheet,
    })),
  {
    ssr: false,
    loading: () => <CalendarSheetFallback label="Loading resource capacity" />,
  },
);

const CalendarScenarioWorkspace = dynamic(
  () =>
    import("./calendar-scenario-workspace").then((module) => ({
      default: module.CalendarScenarioWorkspace,
    })),
  {
    ssr: false,
    loading: () => <CalendarSheetFallback label="Loading scenario" />,
  },
);

const NO_CALENDAR_EVENTS: CalendarListItem[] = [];
const NO_CALENDAR_SEARCH_PAGES: CalendarSearchResponse[] = [];

export function CalendarView() {
  const online = useOnlineStatus();
  const calendarAccess = usePermissionGate("calendar:read");
  const [offlineIntent, setOfflineIntent] =
    useState<CalendarOfflineIntent | null>(null);
  const [offlineEditIntent, setOfflineEditIntent] =
    useState<CalendarOfflineEditIntent | null>(null);
  const [offlineCreateSlot, setOfflineCreateSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [offlineEditEvent, setOfflineEditEvent] = useState<{
    event: CalendarListItem;
    rrule: string | null;
  } | null>(null);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioDrafts, setScenarioDrafts] = useState<
    CalendarScenarioDraftStep[]
  >([]);
  const openCapacity = useCallback(() => setCapacityOpen(true), []);
  const openCoach = useCallback(() => setCoachOpen(true), []);
  const openScenario = useCallback(() => setScenarioOpen(true), []);
  const [myDaySearch, setMyDaySearch] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());
  const debouncedMyDaySearch = useDebouncedValue(myDaySearch, 300);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentDate,
    setCurrentDate,
    view,
    setView,
    viewMode,
    savedFilterId,
    setViewMode,
    calContainerRef,
    calHeight,
    createSlot,
    isCreateOpen,
    setIsCreateOpen,
    shouldMountCreate,
    selected,
    historyBefore,
    historyPages,
    hrEventsVisible,
    crmEventsVisible,
    attendanceEventsVisible,
    setSourceVisibility,
    setHistoryPages,
    accountsOpen,
    setAccountsOpen,
    isCalendarOverlayOpen,
    guardedSelectSlot,
    handleOpenCreate,
    handleSelectEvent,
    handlePrev,
    handleNext,
    handleToday,
    handleCloseSelected,
    handleOpenAccounts,
    handleCloseAccounts,
  } = useCalendarViewState();

  const { data: calendarSources } = useCalendarSources();
  const isHrEnabled =
    calendarSources !== undefined &&
    calendarSources.some((s) => s.module === "hr");
  const isCrmEnabled =
    calendarSources !== undefined &&
    calendarSources.some((s) => s.module === "crm");
  const isAttendanceEnabled =
    calendarSources !== undefined &&
    calendarSources.some((s) => s.key === "hr-attendance");
  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const savedViewsQuery = useCalendarSavedViews(viewMode !== "history");
  const selectedSavedView = savedViewsQuery.data?.pages
    .flatMap((page) => page.items)
    .find((item) =>
      Boolean(
        item && item.id === savedFilterId && item.definition.mode === viewMode,
      ),
    );
  const fetchNextSavedViewPage = savedViewsQuery.fetchNextPage;
  useEffect(() => {
    if (
      !savedFilterId ||
      selectedSavedView ||
      !savedViewsQuery.hasNextPage ||
      savedViewsQuery.isFetchingNextPage
    )
      return;
    void fetchNextSavedViewPage();
  }, [
    fetchNextSavedViewPage,
    savedFilterId,
    savedViewsQuery.hasNextPage,
    savedViewsQuery.isFetchingNextPage,
    selectedSavedView,
  ]);
  const savedViewResolving = Boolean(
    savedFilterId &&
    !selectedSavedView &&
    (savedViewsQuery.isLoading || savedViewsQuery.hasNextPage),
  );
  const savedViewLookupFailed = Boolean(
    savedFilterId && !selectedSavedView && savedViewsQuery.isError,
  );
  const savedViewUnavailable = Boolean(
    savedFilterId &&
    !selectedSavedView &&
    !savedViewResolving &&
    !savedViewLookupFailed,
  );
  const { hiddenIds } = useCalendarAccountFilters();

  const rangeStart = useMemo(
    () => startOfMonth(subMonths(currentDate, 1)),
    [currentDate],
  );
  const rangeEnd = useMemo(
    () => new Date(endOfMonth(addMonths(currentDate, 1)).getTime() + 1),
    [currentDate],
  );

  const {
    data: eventsResponse,
    isLoading: eventsIsLoading,
    isError: eventsIsError,
    error: eventsError,
    refetch: refetchEvents,
  } = useCalendarEvents(
    rangeStart,
    rangeEnd,
    viewMode !== "history" && viewMode !== "my-day" && !savedFilterId,
  );
  const myDayStart = startOfDay(currentDate);
  const myDayWindow = selectedSavedView
    ? calendarSavedViewWindow(selectedSavedView.definition.dateLogic, clockNow)
    : {
        start: myDayStart.toISOString(),
        end: addDays(myDayStart, 1).toISOString(),
      };
  const displayedGridView = selectedSavedView
    ? calendarSavedViewGridView(selectedSavedView.definition.dateLogic)
    : view;
  const myDayQuery = useCalendarSearch(
    {
      start: myDayWindow.start,
      end: myDayWindow.end,
      query: debouncedMyDaySearch.trim() || undefined,
      sourceKey: selectedSavedView?.definition.sourceKey,
      status: selectedSavedView?.definition.status,
      ownerMembershipId:
        selectedSavedView?.definition.ownerMembershipId?.toString(),
      projectId: selectedSavedView?.definition.projectId?.toString(),
      location: selectedSavedView?.definition.location,
      actionable:
        selectedSavedView?.definition.actionable === undefined
          ? undefined
          : selectedSavedView.definition.actionable
            ? "true"
            : "false",
      hiddenConnectionIds:
        hiddenIds.length > 0 ? hiddenIds.join(",") : undefined,
    },
    viewMode !== "history" &&
      (viewMode === "my-day" || Boolean(savedFilterId)) &&
      !savedViewResolving &&
      !savedViewLookupFailed &&
      !savedViewUnavailable,
  );
  const myDayPages = myDayQuery.data?.pages ?? NO_CALENDAR_SEARCH_PAGES;
  const savedSearchSentinelRef = useRef<HTMLDivElement | null>(null);
  const savedSearchRequestedUpdateRef = useRef<number | null>(null);
  const myDayEvents = useMemo(
    () => myDayPages.flatMap((page) => page.events),
    [myDayPages],
  );
  const savedViewActive = viewMode !== "my-day" && Boolean(selectedSavedView);
  useEffect(() => {
    if (
      !savedViewActive ||
      !myDayQuery.hasNextPage ||
      myDayQuery.isFetchingNextPage ||
      !myDayQuery.dataUpdatedAt
    )
      return;
    const sentinel = savedSearchSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const update = myDayQuery.dataUpdatedAt;
    const observer = new IntersectionObserver(([entry]) => {
      if (
        !entry?.isIntersecting ||
        savedSearchRequestedUpdateRef.current === update
      )
        return;
      savedSearchRequestedUpdateRef.current = update;
      void myDayQuery.fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    savedViewActive,
    myDayQuery.hasNextPage,
    myDayQuery.isFetchingNextPage,
    myDayQuery.dataUpdatedAt,
    myDayQuery.fetchNextPage,
  ]);
  const visibleSearchEvents = useMemo(
    () =>
      filterCalendarEventsBySources(myDayEvents, {
        attendanceVisible: attendanceEventsVisible,
        crmVisible: crmEventsVisible,
        hrVisible: hrEventsVisible,
        hiddenConnectionIds: hiddenIds,
      }),
    [
      attendanceEventsVisible,
      crmEventsVisible,
      hiddenIds,
      hrEventsVisible,
      myDayEvents,
    ],
  );
  const events = eventsResponse?.events ?? NO_CALENDAR_EVENTS;
  const sourceFailures = eventsResponse?.failures ?? [];
  const eventsTruncated = eventsResponse?.truncated ?? false;
  const { data: connections = [], isLoading: connectionsLoading } =
    useCalendarConnections();
  const savedGridEvents = useMemo(
    () => visibleSearchEvents.map((event) => toBigCalEvent(event, connections)),
    [connections, visibleSearchEvents],
  );
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);

  const activeConnectionCount = useMemo(
    () => connections.filter((c) => c.status === "active").length,
    [connections],
  );

  useCalendarSourceDeepLink();

  const afterLoad = useAfterLoad();

  const shellVariant = useShellVariant();
  const isMobile = shellVariant === "mobile";
  useEffect(() => {
    if (isMobile && viewMode === "calendar" && !savedFilterId)
      setViewMode("list");
  }, [isMobile, savedFilterId, setViewMode, viewMode]);

  const toggleHrEvents = useCallback(
    () => setSourceVisibility("hr", !hrEventsVisible),
    [hrEventsVisible, setSourceVisibility],
  );
  const toggleCrmEvents = useCallback(
    () => setSourceVisibility("crm", !crmEventsVisible),
    [crmEventsVisible, setSourceVisibility],
  );
  const toggleAttendanceEvents = useCallback(
    () => setSourceVisibility("attendance", !attendanceEventsVisible),
    [attendanceEventsVisible, setSourceVisibility],
  );

  const savedRangeDays = differenceInCalendarDays(
    new Date(myDayWindow.end),
    new Date(myDayWindow.start),
  );
  const gridActive =
    viewMode === "calendar" &&
    afterLoad &&
    !isMobile &&
    (!savedViewActive ||
      selectedSavedView?.definition.dateLogic.kind === "this-month" ||
      savedRangeDays <= 31);
  const attendanceCoverage = useAttendanceCalendarEvents(
    rangeStart,
    rangeEnd,
    attendanceEventsVisible &&
      viewMode !== "history" &&
      viewMode !== "my-day" &&
      !savedFilterId,
  );
  const calendarEvents = useMemo(
    () => mergeSelfAttendanceEvents(events, attendanceCoverage.events),
    [attendanceCoverage.events, events],
  );

  const {
    data: externalData,
    isLoading: externalIsLoading,
    isError: externalIsError,
    error: externalError,
    refetch: refetchExternal,
  } = useExternalCalendarEvents(
    rangeStart,
    rangeEnd,
    viewMode !== "history" &&
      viewMode !== "my-day" &&
      !savedFilterId &&
      (connectionsLoading || activeConnectionCount > 0),
  );

  const historyQuery = useCalendarHistory(
    historyBefore,
    viewMode === "history",
  );
  const historyData = historyQuery.data;
  const historyError = historyQuery.error;
  const historyIsError = historyQuery.isError;
  const historyIsLoading = historyQuery.isLoading;
  const historyHasNextPage = historyQuery.hasNextPage;
  const historyIsFetchingNextPage = historyQuery.isFetchingNextPage;
  const fetchNextHistoryPage = historyQuery.fetchNextPage;
  const refetchHistory = historyQuery.refetch;
  const historyEvents = useMemo(() => {
    const byIdentity = new Map<string, CalendarListItem>();
    for (const page of historyData?.pages ?? []) {
      for (const event of page.events) {
        const identity = `${event.sourceKey}:${event.occurrenceId}`;
        if (!byIdentity.has(identity)) byIdentity.set(identity, event);
      }
    }
    return [...byIdentity.values()].sort(
      (left, right) =>
        new Date(right.end).getTime() - new Date(left.end).getTime(),
    );
  }, [historyData?.pages]);
  const visibleHistoryEvents = useMemo(
    () =>
      filterCalendarEventsBySources(historyEvents, {
        attendanceVisible: attendanceEventsVisible,
        crmVisible: crmEventsVisible,
        hrVisible: hrEventsVisible,
        hiddenConnectionIds: hiddenIds,
      }),
    [
      attendanceEventsVisible,
      crmEventsVisible,
      hiddenIds,
      historyEvents,
      hrEventsVisible,
    ],
  );
  const loadedHistoryPages = historyData?.pages.length ?? 0;
  const autoLoadOlderHistory = useMemo(() => {
    const pages = historyData?.pages ?? [];
    if (pages.length <= 1) return true;
    const prior = new Set(
      pages
        .slice(0, -1)
        .flatMap((page) =>
          page.events.map(
            (event) => `${event.sourceKey}:${event.occurrenceId}`,
          ),
        ),
    );
    return filterCalendarEventsBySources(pages.at(-1)?.events ?? [], {
      attendanceVisible: attendanceEventsVisible,
      crmVisible: crmEventsVisible,
      hrVisible: hrEventsVisible,
      hiddenConnectionIds: hiddenIds,
    }).some((event) => !prior.has(`${event.sourceKey}:${event.occurrenceId}`));
  }, [
    historyData?.pages,
    attendanceEventsVisible,
    crmEventsVisible,
    hrEventsVisible,
    hiddenIds,
  ]);
  useEffect(() => {
    if (
      viewMode !== "history" ||
      loadedHistoryPages >= historyPages ||
      historyIsFetchingNextPage ||
      !historyHasNextPage
    )
      return;
    void fetchNextHistoryPage();
  }, [
    fetchNextHistoryPage,
    historyHasNextPage,
    historyPages,
    historyIsFetchingNextPage,
    loadedHistoryPages,
    viewMode,
  ]);

  const {
    allCalEvents,
    visibleEvents,
    rangeEvents,
    visibleRange,
    formattedRange,
  } = useCalendarComputed({
    events: calendarEvents,
    externalData,
    hiddenIds,
    connections,
    currentDate,
    view,
    hrVisible: hrEventsVisible,
    crmVisible: crmEventsVisible,
    attendanceVisible: attendanceEventsVisible,
  });
  const surfaceEvents =
    viewMode === "history"
      ? visibleHistoryEvents
      : savedViewActive
        ? visibleSearchEvents
        : rangeEvents;
  const selectedListEvent = useMemo(() => {
    if (!selected) return null;
    const selectionEvents =
      savedFilterId && !selectedSavedView
        ? NO_CALENDAR_EVENTS
        : viewMode === "history"
          ? visibleHistoryEvents
          : viewMode === "my-day" || savedViewActive
            ? visibleSearchEvents
            : visibleEvents;
    return (
      selectionEvents.find(
        (event) =>
          event.id === selected.id &&
          calendarSourceFamily(event) === selected.source,
      ) ?? null
    );
  }, [
    selected,
    savedFilterId,
    selectedSavedView,
    visibleEvents,
    visibleHistoryEvents,
    visibleSearchEvents,
    savedViewActive,
    viewMode,
  ]);
  const selectedBigEvent = useMemo(
    () =>
      selectedListEvent ? toBigCalEvent(selectedListEvent, connections) : null,
    [connections, selectedListEvent],
  );
  const selectedExternal =
    selected?.source === "external" ? selectedBigEvent : null;
  const selectedHrEvent =
    selected?.source === "attendance" ||
    (selected?.source === "hr" &&
      selectedListEvent?.sourceKey === "hr-supplemental")
      ? selectedBigEvent
      : null;
  const selectedEvent =
    selected !== null && selectedExternal === null && selectedHrEvent === null
      ? selectedListEvent
      : null;
  const selectedResolutionReady =
    !savedViewResolving &&
    !eventsIsLoading &&
    !externalIsLoading &&
    !attendanceCoverage.isLoading &&
    (viewMode !== "history" || loadedHistoryPages >= historyPages) &&
    ((viewMode !== "my-day" && !savedViewActive) || !myDayQuery.isLoading);
  useEffect(() => {
    if (selected && selectedResolutionReady && !selectedListEvent)
      handleCloseSelected();
  }, [
    handleCloseSelected,
    selected,
    selectedListEvent,
    selectedResolutionReady,
  ]);
  const handleSelectListEvent = useCallback(
    (event: CalendarListItem) =>
      handleSelectEvent(toBigCalEvent(event, connections)),
    [connections, handleSelectEvent],
  );
  const handleSavedViewNavigate = useCallback(
    (date: Date) => {
      router.push(
        calendarUrl(new URLSearchParams(searchParams.toString()), {
          date: format(date, "yyyy-MM-dd"),
          filter: null,
        }),
      );
    },
    [router, searchParams],
  );
  const handleGridViewChange = useCallback(
    (next: typeof view) => {
      if (!savedFilterId) {
        setView(next);
        return;
      }
      router.push(
        calendarUrl(new URLSearchParams(searchParams.toString()), {
          view: next,
          filter: null,
        }),
      );
    },
    [router, savedFilterId, searchParams, setView],
  );
  const handleLoadOlderHistory = useCallback(async () => {
    const result = await fetchNextHistoryPage();
    const nextCount = result.data?.pages.length ?? loadedHistoryPages;
    if (nextCount > loadedHistoryPages) setHistoryPages(nextCount);
  }, [fetchNextHistoryPage, loadedHistoryPages, setHistoryPages]);
  const historyFailures = useMemo(() => {
    const failures = new Map<string, { key: string; label: string }>();
    for (const page of historyData?.pages ?? []) {
      for (const failure of page.failures) failures.set(failure.key, failure);
    }
    return [...failures.values()];
  }, [historyData?.pages]);
  const historyIsPartial = (historyData?.pages ?? []).some(
    (page) => page.truncated || page.coverageState !== "complete",
  );
  const savedViewFailures = useMemo(() => {
    const failures = new Map<string, { key: string; label: string }>();
    for (const page of myDayPages) {
      for (const failure of page.failures) failures.set(failure.key, failure);
    }
    return [...failures.values()];
  }, [myDayPages]);
  const displayedSourceFailures =
    viewMode === "history"
      ? historyFailures
      : viewMode === "my-day" || savedViewActive
        ? savedViewFailures
        : sourceFailures;
  const regularSourcesActive =
    viewMode !== "history" && viewMode !== "my-day" && !savedFilterId;
  const surfaceIsLoading =
    viewMode === "history"
      ? historyIsLoading
      : savedViewActive
        ? myDayQuery.isLoading
        : eventsIsLoading;

  const handleRetryEvents = useCallback(() => {
    void refetchEvents();
  }, [refetchEvents]);
  const handleRetryExternal = useCallback(() => {
    void refetchExternal();
  }, [refetchExternal]);
  const refetchAttendance = attendanceCoverage.refetch;
  const handleRetryAttendance = useCallback(() => {
    void refetchAttendance();
  }, [refetchAttendance]);

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
      onSettled: () =>
        router.replace(
          calendarUrl(new URLSearchParams(searchParams.toString()), {
            connected_account_id: null,
            connectedAccountId: null,
          }),
        ),
    });
  }, [searchParams, finalizeMutate, router, setAccountsOpen]);

  useEffect(() => {
    void loadEventCreateDialog();
  }, []);

  useEffect(() => {
    if (searchParams.get("accounts") === "1") setAccountsOpen(true);
  }, [searchParams, setAccountsOpen]);

  if (online && calendarAccess.pending)
    return <CalendarListFallback label="Checking Calendar access" />;

  if (online && calendarAccess.denied)
    return (
      <NoPermissionState
        permission="calendar:read"
        title="Calendar access denied"
        description="You do not have permission to view Calendar events."
      />
    );

  if (online && calendarAccess.unavailable)
    return (
      <ErrorState
        title="Calendar access unavailable"
        description="Calendar permissions could not be checked. Try again shortly."
      />
    );

  if (!online)
    return (
      <CalendarOfflinePanel
        onQueueIntent={setOfflineIntent}
        queued={offlineIntent !== null}
        loadedEvents={events}
        onQueueEditIntent={setOfflineEditIntent}
        editQueued={offlineEditIntent !== null}
      />
    );

  return (
    <PageWrapper
      title={
        viewMode === "history" ? (
          <div className="flex flex-col">
            <span>Calendar history</span>
            <span className="text-sm font-normal text-muted-foreground">
              Browse past events from newest to oldest
            </span>
          </div>
        ) : viewMode === "my-day" ? (
          <div className="flex flex-col">
            <span>{selectedSavedView?.name ?? "My Day"}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {selectedSavedView
                ? "Saved calendar view"
                : format(currentDate, "EEEE, MMMM d")}
            </span>
          </div>
        ) : selectedSavedView ? (
          <div className="flex flex-col">
            <span>{selectedSavedView.name}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Saved calendar view
            </span>
          </div>
        ) : (
          <CalendarMonthYearPicker
            currentDate={currentDate}
            title={formattedRange}
            onDateChange={setCurrentDate}
          />
        )
      }
      noInternalScroll
      actionsInline
      actions={
        <CalendarToolbarPrimaryActions
          activeConnectionCount={activeConnectionCount}
          onOpenAccounts={handleOpenAccounts}
          onOpenCreate={handleOpenCreate}
        />
      }
    >
      {coachOpen ? (
        <CalendarCoachSheet onClose={() => setCoachOpen(false)} />
      ) : null}
      {capacityOpen ? (
        <CalendarCapacitySheet onClose={() => setCapacityOpen(false)} />
      ) : null}
      {scenarioOpen && scenarioDrafts.length ? (
        <CalendarScenarioWorkspace
          key={JSON.stringify(scenarioDrafts)}
          drafts={scenarioDrafts}
          onRemove={(index) =>
            setScenarioDrafts((current) =>
              current.filter((_, position) => position !== index),
            )
          }
          onClear={() => {
            setScenarioDrafts([]);
            setScenarioOpen(false);
          }}
          onClose={() => setScenarioOpen(false)}
        />
      ) : null}
      {offlineIntent ? (
        <CalendarOfflineIntentReview
          intent={offlineIntent}
          onDiscard={() => setOfflineIntent(null)}
          onContinue={(slot) => {
            setOfflineCreateSlot(slot);
            setOfflineIntent(null);
          }}
        />
      ) : null}
      {offlineEditIntent ? (
        <CalendarOfflineEditReview
          intent={offlineEditIntent}
          onDiscard={() => setOfflineEditIntent(null)}
          onContinue={(event, rrule) => {
            setOfflineEditEvent({ event, rrule });
            setOfflineEditIntent(null);
          }}
        />
      ) : null}
      {offlineCreateSlot ? (
        <EventCreateDialog
          open
          onOpenChange={(open) => {
            if (!open) setOfflineCreateSlot(null);
          }}
          defaultSlot={offlineCreateSlot}
        />
      ) : null}
      {offlineEditEvent ? (
        <EventCreateDialog
          open
          onOpenChange={(open) => {
            if (!open) setOfflineEditEvent(null);
          }}
          event={offlineEditEvent.event}
          rrule={offlineEditEvent.rrule}
        />
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        <CalendarToolbar
          view={displayedGridView}
          viewMode={viewMode}
          hrEventsVisible={hrEventsVisible}
          crmEventsVisible={crmEventsVisible}
          attendanceEventsVisible={attendanceEventsVisible}
          isHrEnabled={isHrEnabled}
          isCrmEnabled={isCrmEnabled}
          isAttendanceEnabled={isAttendanceEnabled}
          sourceFailures={displayedSourceFailures}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onViewChange={handleGridViewChange}
          onViewModeChange={setViewMode}
          onOpenCreate={handleOpenCreate}
          onToggleHrEvents={toggleHrEvents}
          onToggleCrmEvents={toggleCrmEvents}
          onToggleAttendanceEvents={toggleAttendanceEvents}
          onOpenCapacity={openCapacity}
          onOpenCoach={openCoach}
          onOpenScenario={openScenario}
          scenarioCount={scenarioDrafts.length}
          hidePrimaryActions
          navigationDisabled={Boolean(selectedSavedView)}
          filters={
            viewMode !== "history" ? (
              <CalendarSavedViewControls
                selectedId={savedFilterId}
                currentDate={currentDate}
                mode={viewMode}
                search={savedViewActive ? myDaySearch : undefined}
                onSearchChange={setMyDaySearch}
              />
            ) : null
          }
        />

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              ref={calContainerRef}
              className={cn(
                "calendar-container relative flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card",
                viewMode === "calendar" && view === "month"
                  ? "overflow-y-scroll"
                  : "overflow-hidden",
              )}
            >
              {viewMode === "my-day" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  {savedViewResolving || myDayQuery.isLoading ? (
                    <CalendarListFallback label="Loading My Day" />
                  ) : savedViewLookupFailed ? (
                    <ErrorState
                      compact
                      title="Couldn't load saved views"
                      description={getErrorMessage(savedViewsQuery.error)}
                      error={savedViewsQuery.error}
                      onRetry={() => {
                        void savedViewsQuery.refetch();
                      }}
                      className="m-4"
                    />
                  ) : savedViewUnavailable ? (
                    <ErrorState
                      compact
                      title="Saved view unavailable"
                      description="This view is no longer available to you."
                      className="m-4"
                    />
                  ) : (
                    <CalendarMyDayPanel
                      events={visibleSearchEvents}
                      pages={myDayPages}
                      search={myDaySearch}
                      onSearchChange={setMyDaySearch}
                      onSelectEvent={handleSelectListEvent}
                      hasMore={Boolean(myDayQuery.hasNextPage)}
                      isLoadingMore={myDayQuery.isFetchingNextPage}
                      onLoadMore={() => {
                        void myDayQuery.fetchNextPage();
                      }}
                    />
                  )}
                </div>
              ) : savedViewResolving ? (
                <CalendarListFallback label="Loading saved view" />
              ) : savedViewLookupFailed ? (
                <ErrorState
                  compact
                  title="Couldn't load saved views"
                  description={getErrorMessage(savedViewsQuery.error)}
                  error={savedViewsQuery.error}
                  onRetry={() => {
                    void savedViewsQuery.refetch();
                  }}
                  className="m-4"
                />
              ) : savedViewUnavailable ? (
                <ErrorState
                  compact
                  title="Saved view unavailable"
                  description="This view is no longer available to you."
                  className="m-4"
                />
              ) : viewMode === "calendar" ? (
                savedViewActive && myDayQuery.isLoading ? (
                  <CalendarListFallback label="Loading saved view" />
                ) : regularSourcesActive && eventsIsLoading ? (
                  <CalendarListFallback label="Loading events" />
                ) : gridActive ? (
                  <CalendarGridLayer
                    events={savedViewActive ? savedGridEvents : allCalEvents}
                    currentDate={
                      savedViewActive
                        ? new Date(myDayWindow.start)
                        : currentDate
                    }
                    view={displayedGridView}
                    calHeight={calHeight}
                    onView={handleGridViewChange}
                    onNavigate={
                      savedViewActive ? handleSavedViewNavigate : setCurrentDate
                    }
                    onSelectSlot={
                      isCalendarOverlayOpen || savedViewActive
                        ? undefined
                        : guardedSelectSlot
                    }
                    onSelectEvent={handleSelectEvent}
                  />
                ) : savedViewActive ? (
                  <CalendarEventsPanel
                    mode="list"
                    events={visibleSearchEvents}
                    range={{
                      start: new Date(myDayWindow.start),
                      end: new Date(myDayWindow.end),
                    }}
                    onSelectEvent={handleSelectListEvent}
                  />
                ) : (
                  <CalendarAgendaPreview
                    events={surfaceEvents}
                    onSelectEvent={handleSelectListEvent}
                  />
                )
              ) : isMobile ? (
                surfaceIsLoading ? (
                  <CalendarListFallback label="Loading events" />
                ) : viewMode === "history" ? (
                  <CalendarEventsPanel
                    key={`history:${historyBefore ?? "now"}`}
                    mode="history"
                    events={visibleHistoryEvents}
                    onSelectEvent={handleSelectListEvent}
                    hasMore={
                      historyHasNextPage && loadedHistoryPages >= historyPages
                    }
                    isLoadingMore={historyIsFetchingNextPage}
                    autoLoadMore={autoLoadOlderHistory}
                    onLoadMore={handleLoadOlderHistory}
                    loadedPageCount={loadedHistoryPages}
                  />
                ) : (
                  <CalendarEventsPanel
                    mode="list"
                    events={savedViewActive ? visibleSearchEvents : visibleEvents}
                    range={
                      savedViewActive
                        ? {
                            start: new Date(myDayWindow.start),
                            end: new Date(myDayWindow.end),
                          }
                        : visibleRange
                    }
                    onSelectEvent={handleSelectListEvent}
                  />
                )
              ) : surfaceIsLoading ? (
                <CalendarListFallback label="Loading events" />
              ) : afterLoad ? (
                <CalendarEventsPanel
                  key={
                    viewMode === "history"
                      ? `history:${historyBefore ?? "now"}`
                      : "list"
                  }
                  mode={viewMode}
                  events={
                    viewMode === "history"
                      ? visibleHistoryEvents
                      : savedViewActive
                        ? visibleSearchEvents
                        : visibleEvents
                  }
                  range={
                    viewMode === "list"
                      ? savedViewActive
                        ? {
                            start: new Date(myDayWindow.start),
                            end: new Date(myDayWindow.end),
                          }
                        : visibleRange
                      : undefined
                  }
                  onSelectEvent={handleSelectListEvent}
                  hasMore={
                    viewMode === "history" &&
                    historyHasNextPage &&
                    loadedHistoryPages >= historyPages
                  }
                  isLoadingMore={historyIsFetchingNextPage}
                  autoLoadMore={viewMode !== "history" || autoLoadOlderHistory}
                  loadedPageCount={
                    viewMode === "history" ? loadedHistoryPages : 0
                  }
                  onLoadMore={
                    viewMode === "history" ? handleLoadOlderHistory : undefined
                  }
                />
              ) : viewMode === "history" ? (
                <CalendarEventsPanel
                  key={`history:${historyBefore ?? "now"}`}
                  mode="history"
                  events={visibleHistoryEvents}
                  onSelectEvent={handleSelectListEvent}
                  hasMore={
                    historyHasNextPage && loadedHistoryPages >= historyPages
                  }
                  isLoadingMore={historyIsFetchingNextPage}
                  autoLoadMore={autoLoadOlderHistory}
                  onLoadMore={handleLoadOlderHistory}
                  loadedPageCount={loadedHistoryPages}
                />
              ) : (
                <CalendarAgendaPreview
                  events={surfaceEvents}
                  maxEvents={20}
                  onSelectEvent={handleSelectListEvent}
                />
              )}
              {savedViewActive ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  <span>
                    Saved range: {format(new Date(myDayWindow.start), "PP")} –{" "}
                    {format(new Date(Date.parse(myDayWindow.end) - 1), "PP")}
                  </span>
                  {calendarSearchIsPartial(
                    myDayPages,
                    Boolean(myDayQuery.hasNextPage),
                  ) ? (
                    <span role="status">
                      {myDayQuery.hasNextPage
                        ? "More results are available and load as you reach this section."
                        : "Some sources returned incomplete results. Try a shorter date range or refresh after they recover."}
                    </span>
                  ) : null}
                  <div
                    ref={savedSearchSentinelRef}
                    aria-hidden="true"
                    className="h-px w-full"
                  />
                  {myDayQuery.isFetchingNextPage ? (
                    <span role="status">
                      <CalendarLoadingStatus label="Loading additional results…" />
                    </span>
                  ) : null}
                </div>
              ) : null}
              {regularSourcesActive &&
              !surfaceIsLoading &&
              (externalIsLoading || attendanceCoverage.isLoading) ? (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <CalendarLoadingStatus label="Loading calendar sources…" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {(viewMode === "my-day" || savedViewActive) && myDayQuery.isError && (
          <ErrorState
            compact
            title="Couldn't load calendar search"
            description={getErrorMessage(myDayQuery.error)}
            error={myDayQuery.error}
            onRetry={() => {
              void myDayQuery.refetch();
            }}
            className="shrink-0 border border-border rounded-xl"
          />
        )}

        {regularSourcesActive && eventsIsError && (
          <ErrorState
            compact
            title="Couldn't load calendar events"
            description={getErrorMessage(eventsError)}
            onRetry={handleRetryEvents}
            className="shrink-0 border border-border rounded-xl"
          />
        )}

        {viewMode === "history" && historyIsError && (
          <ErrorState
            compact
            title="Couldn't load calendar history"
            description={getErrorMessage(historyError)}
            error={historyError}
            onRetry={() => {
              if (historyQuery.isFetchNextPageError)
                void handleLoadOlderHistory();
              else void refetchHistory();
            }}
            className="shrink-0 border border-border rounded-xl"
          />
        )}

        {regularSourcesActive &&
          attendanceEventsVisible &&
          attendanceCoverage.access.denied && (
            <NoPermissionState
              compact
              permission="self:attendance"
              title="Attendance hidden"
              description="You do not have permission to view attendance and work-from-home coverage."
              className="shrink-0 rounded-xl border border-border"
            />
          )}

        {regularSourcesActive && attendanceCoverage.isError && (
          <ErrorState
            compact
            title="Attendance coverage is incomplete"
            description={getErrorMessage(attendanceCoverage.error)}
            error={attendanceCoverage.error}
            onRetry={handleRetryAttendance}
            className="shrink-0 border border-border rounded-xl"
          />
        )}

        {(viewMode === "history"
          ? historyIsPartial
          : regularSourcesActive && eventsTruncated) && (
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-1.5">
            <span className="min-w-0 flex-1 text-dense text-status-warning-ink">
              {viewMode === "history"
                ? historyHasNextPage
                  ? "Some history sources are partial. Retry this period before relying on its events; continuing to older periods may skip omitted events."
                  : "This history period remains incomplete, and older periods cannot be loaded safely. Retry this period later."
                : CALENDAR_TRUNCATED_WARNING}
            </span>
            <button
              type="button"
              onClick={
                viewMode === "history"
                  ? () => void refetchHistory()
                  : handleRetryEvents
              }
              className="shrink-0 text-dense font-medium text-status-warning-ink underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {regularSourcesActive && externalIsError && (
          <ErrorState
            compact
            title="Couldn't load connected calendars"
            description={getErrorMessage(externalError)}
            error={externalError}
            onRetry={handleRetryExternal}
            className="shrink-0 border border-border rounded-xl"
          />
        )}

        {regularSourcesActive &&
          externalData?.errors &&
          externalData.errors.length > 0 && (
            <div className="flex shrink-0 flex-col gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-1.5 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 text-dense text-status-warning-ink">
                {externalData.errors
                  .map((e) => `${e.accountEmail ?? "Account"}: ${e.message}`)
                  .join(" · ")}
              </span>
              <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleRetryExternal}
                  className="text-dense font-medium text-status-warning-ink underline underline-offset-2"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleOpenAccounts}
                  className="text-dense font-medium text-status-warning-ink underline underline-offset-2"
                >
                  Manage accounts
                </button>
              </div>
            </div>
          )}

        {regularSourcesActive &&
          externalData &&
          !externalData.complete &&
          externalData.errors.length === 0 && (
            <div
              className="flex shrink-0 items-center gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-1.5 text-dense text-status-warning-ink"
              role="status"
            >
              <span className="min-w-0 flex-1">
                Connected calendar coverage is partial. Retry before relying on
                this time window.
              </span>
              <button
                type="button"
                onClick={handleRetryExternal}
                className="shrink-0 font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

        {shouldMountCreate && (
          <EventCreateDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            defaultSlot={createSlot}
          />
        )}

        {selectedEvent !== null && (
          <EventDetailSheet
            event={selectedEvent}
            onClose={handleCloseSelected}
            onQueueScenarioStep={(draft) => {
              setScenarioDrafts((current) => {
                const matching = current.findIndex(
                  (item) =>
                    item.step.sourceKey === draft.step.sourceKey &&
                    item.step.entityType === draft.step.entityType &&
                    item.step.sourceRecordId === draft.step.sourceRecordId,
                );
                if (matching >= 0)
                  return current.map((item, index) =>
                    index === matching ? draft : item,
                  );
                if (current.length >= 20) {
                  toast.error("A scenario can contain at most 20 changes");
                  return current;
                }
                return [...current, draft];
              });
              handleCloseSelected();
              setScenarioOpen(true);
            }}
          />
        )}
        {selectedExternal !== null && (
          <ExternalEventDetailSheet
            event={selectedExternal}
            onClose={handleCloseSelected}
          />
        )}
        {selectedHrEvent !== null && (
          <HrEventDetailSheet
            event={selectedHrEvent}
            onClose={handleCloseSelected}
          />
        )}
        {accountsOpen && (
          <CalendarAccountsSheet open onClose={handleCloseAccounts} />
        )}
      </div>
    </PageWrapper>
  );
}
