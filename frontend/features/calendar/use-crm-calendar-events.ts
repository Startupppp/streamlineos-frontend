"use client";

import { useCalendarSourceVisibility } from "./use-calendar-source-visibility";

export function useCrmEventsVisible() {
  return useCalendarSourceVisibility("crmEvents", true);
}
