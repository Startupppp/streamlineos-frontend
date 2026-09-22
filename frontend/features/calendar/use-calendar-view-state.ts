"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import type { View, SlotInfo, BigCalEvent } from "./big-calendar-wrapper";
import { useCalendarSlotSelectionGuard } from "./use-calendar-slot-selection-guard";

export function useCalendarViewState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "history">(
    "calendar",
  );
  const calContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
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
  const [selectedExternal, setSelectedExternal] =
    useState<BigCalEvent | null>(null);
  const [selectedHrEvent, setSelectedHrEvent] =
    useState<BigCalEvent | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);

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
    if (createParamConsumedRef.current) return;
    if (searchParams.get("create") !== "1") return;
    createParamConsumedRef.current = true;
    setCreateSlot(null);
    setIsCreateOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    router.replace(`/calendar${next.size > 0 ? `?${next.toString()}` : ""}`);
  }, [searchParams, router]);

  const isCalendarOverlayOpen =
    isCreateOpen ||
    isSlotChoiceOpen ||
    isCreateTicketOpen ||
    accountsOpen ||
    selectedEventId !== null ||
    selectedExternal !== null ||
    selectedHrEvent !== null;

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setPendingSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsSlotChoiceOpen(true);
  }, []);

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
          `/build/${event.resource.projectId}/issues?ticket=${event.resource.entityId}`,
        );
        return;
      }
      setSelectedEventId(String(event.id));
    },
    [router],
  );

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
  };
}
