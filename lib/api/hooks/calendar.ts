"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CalendarEvent {
  id: number;
  orgId: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean | null;
  color?: string | null;
  category: string;
  entityType?: string | null;
  entityId?: string | null;
  createdBy: string;
  attendeeIds?: string[] | null;
  isRecurring?: boolean | null;
  recurringRule?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  creator?: { name: string | null } | null;
}

export interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  color?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  attendeeIds?: string[];
  isRecurring?: boolean;
  recurringRule?: string;
}

export interface UpdateCalendarEventPayload extends Partial<CreateCalendarEventPayload> {
  id: number;
}

export function useCalendarEvents(start: Date, end: Date) {
  return useQuery({
    queryKey: ["calendar", "events", start.toISOString(), end.toISOString()],
    queryFn: () =>
      apiClient.get<CalendarEvent[]>("/calendar/events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) =>
      apiClient.post<CalendarEvent>("/calendar/events", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCalendarEventPayload) =>
      apiClient.put<CalendarEvent>(`/calendar/events/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ deleted: boolean }>(`/calendar/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });
}
