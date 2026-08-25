"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

interface CalendarOrgMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export function useCalendarOrgMembers() {
  const canView = useCan("directory:people:view");
  return useQuery({
    queryKey: queryKeys.calendar.orgMembers(),
    queryFn: () => apiClient.get<CalendarOrgMember[]>("/org/members"),
    staleTime: 5 * 60 * 1000,
    enabled: canView,
  });
}

export type { CalendarOrgMember };

export function useCalendarMemberSearch(search: string, enabled = true) {
  const term = search.trim();
  return useQuery({
    queryKey: queryKeys.calendar.memberSearch(term),
    queryFn: () =>
      apiClient.get<CalendarOrgMember[]>("/org/members", {
        search: term,
        limit: 25,
      }),
    enabled: enabled && term.length > 0,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

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

export interface CalendarListItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string | null;
  category: string;
  source:
    | "event"
    | "leave"
    | "interview"
    | "task"
    | "holiday"
    | "attendance";
  location?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  creatorName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  projectId?: number | null;
  linkedTicket?: {
    id: number;
    key: string;
    title: string;
    projectId: number;
    status: string;
  } | null;
  myRsvpStatus?: string | null;
}

export function extractEventNumericId(id: string): number | null {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  location?: string;
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
  syncConnectionId?: number;
  addConference?: boolean;
}

interface UpdateCalendarEventPayload
  extends Omit<Partial<CreateCalendarEventPayload>, "entityType" | "entityId"> {
  id: number;
  entityType?: string | null;
  entityId?: string | null;
}

export interface CalendarEventsResponse {
  events: CalendarListItem[];
  failures: Array<{ key: string; label: string }>;
  truncated: boolean;
}

export function useCalendarEvents(start: Date, end: Date) {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: queryKeys.calendar.events(start.toISOString(), end.toISOString()),
    queryFn: () =>
      apiClient.get<CalendarEventsResponse>("/calendar/events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    staleTime: 2 * 60 * 1000,
    enabled: canView,
  });
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

type RsvpStatus = "accepted" | "declined" | "tentative";

interface EventAttendee {
  id: number;
  eventId: number;
  userId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export function useEventAttendees(eventId: number | null) {
  return useQuery({
    queryKey: queryKeys.calendar.attendees(eventId ?? 0),
    queryFn: () => apiClient.get<EventAttendee[]>(`/calendar/events/${eventId}/rsvp`),
    enabled: eventId !== null,
    staleTime: 60 * 1000,
  });
}

export function useRsvpCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "events", "rsvp"],
    mutationFn: ({ eventId, status }: { eventId: number; status: RsvpStatus }) =>
      apiClient.post<EventAttendee>(`/calendar/events/${eventId}/rsvp`, { status }),
    onSuccess: (_, { eventId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.attendees(eventId) });
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export interface ExternalCalendarEvent {
  id: string;
  connectionId: number;
  toolkit: "googlecalendar" | "outlook";
  accountEmail: string | null;
  providerEventId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  webLink: string | null;
}

export interface ExternalCalendarEventsResponse {
  events: ExternalCalendarEvent[];
  errors: Array<{ connectionId: number; accountEmail: string | null; message: string }>;
}

export function useExternalCalendarEvents(start: Date, end: Date, enabled: boolean) {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: queryKeys.calendar.externalEvents(start.toISOString(), end.toISOString()),
    queryFn: () =>
      apiClient.get<ExternalCalendarEventsResponse>("/calendar/external-events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    enabled: canView && enabled,
    staleTime: 60_000,
  });
}

export interface CalendarSource {
  key: string;
  label: string;
  module: string;
  enabled: boolean;
}

export function useCalendarSources() {
  const canView = useCan("calendar:read");
  return useQuery({
    queryKey: queryKeys.calendar.sources(),
    queryFn: () => apiClient.get<CalendarSource[]>("/calendar/sources"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useSetCalendarSourcePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["calendar", "sources", "set-preference"],
    mutationFn: ({ sourceKey, enabled }: { sourceKey: string; enabled: boolean }) =>
      apiClient.put<{ sourceKey: string; enabled: boolean }>(
        `/calendar/sources/${sourceKey}`,
        { enabled },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false });
    },
  });
}
