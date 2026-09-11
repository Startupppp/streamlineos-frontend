"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface CalendarEvent {
  id: number;
  orgId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
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

interface OooConflict {
  userId: string;
  userName: string | null;
  leaveStart: string;
  leaveEnd: string;
}

interface MutateCalendarEventResponse {
  event: CalendarEvent;
  oooConflicts: OooConflict[];
  meetingUrl?: string | null;
  syncError?: string | null;
}

export interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  allDay?: boolean;
  color?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  attendeeIds?: string[];
  rrule?: string;
  recurrenceEnd?: string;
  syncConnectionId?: number;
  addConference?: boolean;
}

interface UpdateCalendarEventPayload {
  id: number;
  title?: string;
  description?: string | null;
  location?: string | null;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  allDay?: boolean;
  color?: string | null;
  category?: string;
  entityType?: string | null;
  entityId?: string | null;
  attendeeIds?: string[];
  rrule?: string | null;
  recurrenceEnd?: string | null;
}

interface UpsertOccurrenceExceptionPayload {
  eventId: number;
  occurrenceStart: string;
  modifiedTitle?: string;
  modifiedStart?: string;
  modifiedEnd?: string;
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "create"],
    mutationFn: (payload: CreateCalendarEventPayload) =>
      apiClient.post<MutateCalendarEventResponse>("/calendar/events", payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "update"],
    mutationFn: ({ id, ...payload }: UpdateCalendarEventPayload) =>
      apiClient.put<CalendarEvent>(`/calendar/events/${id}`, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ deleted: boolean }>(`/calendar/events/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useUpsertOccurrenceException() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "occurrence", "upsert"],
    mutationFn: ({ eventId, occurrenceStart, ...body }: UpsertOccurrenceExceptionPayload) =>
      apiClient.patch<{ id: number }>(
        `/calendar/events/${eventId}/occurrences/${encodeURIComponent(occurrenceStart)}`,
        body,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}

export function useCancelOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "occurrence", "cancel"],
    mutationFn: ({ eventId, occurrenceStart }: { eventId: number; occurrenceStart: string }) =>
      apiClient.delete<{ id: number }>(
        `/calendar/events/${eventId}/occurrences/${encodeURIComponent(occurrenceStart)}`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false }),
  });
}
