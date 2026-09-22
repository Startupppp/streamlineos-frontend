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

export function useTimesheetHolidays(startDate: string, endDate: string, enabled = true) {
  const canView = useCan("timesheets:entries:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.holidays(startDate, endDate),
    queryFn: ({ signal }) =>
      apiClient.get<HolidaysResponse>("/timesheets/calendar/holidays", { startDate, endDate }, signal),
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView && !!startDate && !!endDate,
  });
}
