"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import type {
  PayrollCalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/types/payroll/reports";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const calendarEventListC = lazyContract(() =>
  import("@/hooks/api/payroll/calendar-schema").then((m) => m.calendarEventListContract),
);
const generateCalendarResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/calendar-schema").then((m) => m.generateCalendarResponseContract),
);
const calendarEventC = lazyContract(() =>
  import("@/hooks/api/payroll/calendar-schema").then((m) => m.calendarEventContract),
);

export function usePayrollCalendar(params: { from: string; to: string }) {
  const canView = useCan("payroll:runs:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.calendar({ from: params.from, to: params.to }),
    queryFn: ({ signal }) => apiClient.get<PayrollCalendarEvent[]>("/payroll/calendar", params, signal, calendarEventListC),
    staleTime: 5 * 60_000,
    enabled: canView && !!params.from && !!params.to,
  });
}

export function useGenerateCalendarMonth() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "calendar", "generate"],
    mutationFn: ({ month }: { month: string }) =>
      apiClient.post<{ ok: boolean }>(`/payroll/calendar/generate?month=${encodeURIComponent(month)}`, undefined, undefined, generateCalendarResponseC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.calendarAll });
    },
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "calendar", "create"],
    mutationFn: (data: CreateCalendarEventInput) =>
      apiClient.post<PayrollCalendarEvent>("/payroll/calendar", data, undefined, calendarEventC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.calendarAll });
    },
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "calendar", "update"],
    mutationFn: ({ eventId, ...data }: { eventId: number } & UpdateCalendarEventInput) =>
      apiClient.patch<PayrollCalendarEvent>(`/payroll/calendar/${eventId}`, data, undefined, calendarEventC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.calendarAll });
    },
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:settings:manage", {
    mutationKey: ["payroll", "calendar", "delete"],
    mutationFn: ({ eventId }: { eventId: number }) =>
      apiClient.delete<void>(`/payroll/calendar/${eventId}`, undefined, undefined, undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.calendarAll });
    },
  });
}
