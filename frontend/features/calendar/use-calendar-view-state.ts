"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type SetStateAction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  format,
} from "date-fns";
import type { View, SlotInfo, BigCalEvent } from "./big-calendar-wrapper";
import { useCalendarSlotSelectionGuard } from "./use-calendar-slot-selection-guard";
import {
  calendarUrl,
  parseCalendarUrlState,
  type CalendarSelectionSource,
  type CalendarViewMode,
} from "./calendar-url-state";

export function useCalendarViewState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fallbackNow] = useState(() => new Date());
  const urlState = useMemo(
    () =>
      parseCalendarUrlState(
        new URLSearchParams(searchParams.toString()),
        fallbackNow,
      ),
    [fallbackNow, searchParams],
  );
  const currentDate = urlState.date;
  const view = urlState.view;
  const viewMode = urlState.mode;
  const createRequested = searchParams.get("create") === "1";
  const calContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [createSlot, setCreateSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [createOpenState, setCreateOpenState] = useState(false);
  const [hasMountedCreate, setHasMountedCreate] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);

  const navigate = useCallback(
    (
      changes: Record<string, string | null>,
      method: "push" | "replace" = "push",
    ) => {
      router[method](
        calendarUrl(new URLSearchParams(searchParams.toString()), changes),
      );
    },
    [router, searchParams],
  );

  const isCreateOpen = createRequested || createOpenState;
  const shouldMountCreate = createRequested || hasMountedCreate;
  const setIsCreateOpen = useCallback(
    (open: boolean) => {
      setCreateOpenState(open);
      if (!open) setCreateSlot(null);
      if (!open && createRequested) navigate({ create: null }, "replace");
    },
    [createRequested, navigate],
  );

  const setCurrentDate = useCallback(
    (next: SetStateAction<Date>) => {
      const resolved = typeof next === "function" ? next(currentDate) : next;
      if (format(resolved, "yyyy-MM-dd") === format(currentDate, "yyyy-MM-dd"))
        return;
      navigate({ date: format(resolved, "yyyy-MM-dd") });
    },
    [currentDate, navigate],
  );

  const setView = useCallback(
    (next: View) => {
      if (next === view) return;
      navigate({ view: next });
    },
    [navigate, view],
  );

  const setViewMode = useCallback(
    (next: CalendarViewMode) => {
      if (next === viewMode) return;
      navigate({
        mode: next,
        filter: null,
        historyBefore: next === "history" ? urlState.historyBefore : null,
        historyPages: next === "history" ? String(urlState.historyPages) : null,
      });
    },
    [navigate, urlState.historyBefore, urlState.historyPages, viewMode],
  );

  const setSourceVisibility = useCallback(
    (source: "hr" | "crm" | "attendance", visible: boolean) => {
      navigate({ [source]: visible ? "1" : "0" });
    },
    [navigate],
  );

  const setHistoryPages = useCallback(
    (pages: number) => {
      navigate(
        { historyPages: String(Math.min(120, Math.max(1, pages))) },
        "replace",
      );
    },
    [navigate],
  );

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

  useEffect(() => {
    if (viewMode !== "history" || searchParams.has("historyBefore")) return;
    navigate(
      {
        historyBefore: urlState.historyBefore,
        historyPages: String(urlState.historyPages),
      },
      "replace",
    );
  }, [
    navigate,
    searchParams,
    urlState.historyBefore,
    urlState.historyPages,
    viewMode,
  ]);

  const isCalendarOverlayOpen =
    isCreateOpen ||
    accountsOpen ||
    urlState.selected !== null;

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setHasMountedCreate(true);
    setCreateSlot({ start: slotInfo.start, end: slotInfo.end });
    setCreateOpenState(true);
  }, []);

  const guardedSelectSlot = useCalendarSlotSelectionGuard(
    handleSelectSlot,
    isCalendarOverlayOpen,
  );

  const handleOpenCreate = useCallback(() => {
    setCreateSlot(null);
    setHasMountedCreate(true);
    setIsCreateOpen(true);
  }, [setIsCreateOpen]);

  const handleSelectEvent = useCallback(
    (event: BigCalEvent) => {
      const source = (event.resource?.sourceFamily ??
        (event.resource?.source === "external"
          ? "external"
          : event.resource?.source === "hr"
            ? "hr"
            : "calendar")) as CalendarSelectionSource;
      navigate({ event: String(event.id), eventSource: source });
    },
    [navigate],
  );

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "my-day") return subDays(d, 1);
      if (view === "month") return subMonths(d, 1);
      if (view === "week") return subWeeks(d, 1);
      return subDays(d, 1);
    });
  }, [setCurrentDate, view, viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === "my-day") return addDays(d, 1);
      if (view === "month") return addMonths(d, 1);
      if (view === "week") return addWeeks(d, 1);
      return addDays(d, 1);
    });
  }, [setCurrentDate, view, viewMode]);

  const handleToday = useCallback(
    () => setCurrentDate(new Date()),
    [setCurrentDate],
  );
  const handleCloseSelected = useCallback(() => {
    navigate({ event: null, eventSource: null }, "replace");
  }, [navigate]);
  const handleOpenAccounts = useCallback(() => setAccountsOpen(true), []);
  const handleCloseAccounts = useCallback(() => setAccountsOpen(false), []);
  return {
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
    shouldMountCreate,
    selected: urlState.selected,
    historyBefore: urlState.historyBefore,
    historyPages: urlState.historyPages,
    savedFilterId: urlState.savedFilterId,
    hrEventsVisible: urlState.hrVisible,
    crmEventsVisible: urlState.crmVisible,
    attendanceEventsVisible: urlState.attendanceVisible,
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
  };
}
