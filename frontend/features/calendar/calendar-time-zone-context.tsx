"use client";

import { createContext, useContext, type ReactNode } from "react";
import { readerTimeZone } from "@/lib/date-utils";

const CalendarTimeZoneContext = createContext<string | null>(null);

interface CalendarTimeZoneProviderProps {
  timeZone: string;
  children: ReactNode;
}

export function CalendarTimeZoneProvider({ timeZone, children }: CalendarTimeZoneProviderProps) {
  return <CalendarTimeZoneContext.Provider value={timeZone}>{children}</CalendarTimeZoneContext.Provider>;
}

export function useCalendarTimeZone(): string {
  return useContext(CalendarTimeZoneContext) ?? readerTimeZone();
}
