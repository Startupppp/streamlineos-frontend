"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ComplianceCalendarEvent {
  date: string;
  type: "document_expiry" | "certification_expiry";
  title: string;
  entityId: number;
  entityName: string;
}

export interface ComplianceCalendarResponse {
  events: ComplianceCalendarEvent[];
  year: number;
  month: number;
}

export function useComplianceCalendar(year: number, month: number) {
  return useQuery<ComplianceCalendarResponse>({
    queryKey: queryKeys.hr.complianceCalendar(year, month),
    queryFn: () =>
      apiClient.get<ComplianceCalendarResponse>("/hr/compliance/calendar", {
        year: String(year),
        month: String(month),
      }),
    staleTime: 5 * 60_000,
  });
}
