"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  PayrollCalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/types/payroll/reports";

export function usePayrollCalendar(params: { from: string; to: string }) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: queryKeys.payroll.calendar({ from: params.from, to: params.to }),
    queryFn: ({ signal }) => apiClient.get<PayrollCalendarEvent[]>("/payroll/calendar", params, signal),
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
      qc.invalidateQueries({ queryKey: queryKeys.payroll.calendarAll });
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
      qc.invalidateQueries({ queryKey: queryKeys.payroll.calendarAll });
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
      qc.invalidateQueries({ queryKey: queryKeys.payroll.calendarAll });
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
      qc.invalidateQueries({ queryKey: queryKeys.payroll.calendarAll });
    },
  });
}
