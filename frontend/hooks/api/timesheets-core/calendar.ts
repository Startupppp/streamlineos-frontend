"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";

export interface TimesheetHoliday {
  date: string;
  name: string;
  isPublic: boolean;
}

interface HolidaysResponse {
  startDate: string;
  endDate: string;
  holidays: TimesheetHoliday[];
}

/**
 * The organisation's holidays for a week.
 *
 * Gated on `timesheets:entries:view` rather than `reports:view`, matching the
 * route: this is for the person filling in the grid, not for someone reading
 * reports about it.
 */
export function useTimesheetHolidays(startDate: string, endDate: string, enabled = true) {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.holidays(startDate, endDate),
    queryFn: () =>
      apiClient.get<HolidaysResponse>("/timesheets/calendar/holidays", { startDate, endDate }),
    /** Holidays for a past week never change; a long stale time is free. */
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView && !!startDate && !!endDate,
  });
}
