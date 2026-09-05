"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

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
  const canManage = useCan("hr:compliance:manage");
  return useQuery<ComplianceCalendarResponse>({
    queryKey: humanResourcesQueryKeys.hr.complianceCalendar(year, month),
    queryFn: ({ signal }) =>
      apiClient.get<ComplianceCalendarResponse>("/hr/compliance/calendar", {
        year: String(year),
        month: String(month),
      }, signal),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}
