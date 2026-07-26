"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type {
  PayrollCalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/types/payroll/reports";

export const calendarKeys = {
  all: ["payroll", "calendar"] as const,
  list: (from: string, to: string) => ["payroll", "calendar", from, to] as const,
};

export function usePayrollCalendar(params: { from: string; to: string }) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: calendarKeys.list(params.from, params.to),
    queryFn: () => apiClient.get<PayrollCalendarEvent[]>("/payroll/calendar", params),
    staleTime: 5 * 60_000,
    enabled: canView && !!params.from && !!params.to,
  });
}

export function useGenerateCalendarMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "calendar", "generate"],
    mutationFn: ({ month }: { month: string }) =>
      apiClient.post<{ ok: boolean }>(`/payroll/calendar/generate?month=${encodeURIComponent(month)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "calendar", "create"],
    mutationFn: (data: CreateCalendarEventInput) =>
      apiClient.post<PayrollCalendarEvent>("/payroll/calendar", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "calendar", "update"],
    mutationFn: ({ eventId, ...data }: { eventId: number } & UpdateCalendarEventInput) =>
      apiClient.patch<PayrollCalendarEvent>(`/payroll/calendar/${eventId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "calendar", "delete"],
    mutationFn: ({ eventId }: { eventId: number }) =>
      apiClient.delete<void>(`/payroll/calendar/${eventId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
