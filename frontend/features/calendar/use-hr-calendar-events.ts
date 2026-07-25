"use client";

import { useCallback, useSyncExternalStore, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "@/lib/api-client";
import type { HrCalendarEvent } from "@/hooks/api/hr/hr-calendar";
import type { BigCalEvent } from "./big-calendar-wrapper";

const STORAGE_KEY = "streamlineos.calendar.hrEventsVisible";
const listeners = new Set<() => void>();
let cache: boolean = true;
let cacheRaw: string | null = null;

function readSnapshot(): boolean {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = raw === null ? true : raw !== "false";
  return cache;
}

function write(visible: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(visible));
  cacheRaw = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHrEventsVisible() {
  const visible = useSyncExternalStore(subscribe, readSnapshot, () => cache);
  const toggle = useCallback(() => write(!readSnapshot()), []);
  return { visible, toggle };
}

const HR_TYPE_COLORS: Record<string, string> = {
  HOLIDAY: "#3b82f6",
  LEAVE: "#60a5fa",
  BIRTHDAY: "#93c5fd",
  ANNIVERSARY: "#bfdbfe",
  REVIEW_CYCLE: "#2563eb",
  TRAVEL: "#38bdf8",
  INTERVIEW: "#0284c7",
};

export function useHrCalendarEventsMapped(
  rangeStart: Date,
  rangeEnd: Date,
): { hrCalEvents: BigCalEvent[]; hrEnabled: boolean } {
  const forbiddenRef = useRef(false);

  const from = format(rangeStart, "yyyy-MM-dd");
  const to = format(rangeEnd, "yyyy-MM-dd");

  const { data, isError, error } = useQuery({
    queryKey: ["hr", "calendar", from, to],
    queryFn: () =>
      apiClient.get<HrCalendarEvent[]>("/hr/calendar", { from, to }),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !forbiddenRef.current,
  });

  if (isError) {
    const status = (error as { status?: number } | null)?.status;
    if (status === 403) {
      forbiddenRef.current = true;
    }
  }

  const hrCalEvents: BigCalEvent[] = (data ?? []).map((ev) => ({
    id: `hr-${ev.id}`,
    title: ev.title,
    start: new Date(ev.date),
    end: new Date(ev.endDate ?? ev.date),
    allDay: true,
    resource: {
      source: "hr",
      color: HR_TYPE_COLORS[ev.type] ?? "#3b82f6",
      hrEventType: ev.type,
    },
  }));

  return { hrCalEvents, hrEnabled: !forbiddenRef.current };
}
