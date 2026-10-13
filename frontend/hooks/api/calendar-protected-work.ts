"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CalendarProtectedWork, CalendarProtectedWorkList, CalendarProtectedWorkSuggestions } from "./calendar-protected-work-schema";
import type { z } from "zod";
import type { calendarUpdateEventContract } from "./calendar-schema";

type CalendarEvent = z.infer<typeof calendarUpdateEventContract>;

const listContract = lazyContract(() => import("./calendar-protected-work-schema").then((module) => module.calendarProtectedWorkListContract));
const itemContract = lazyContract(() => import("./calendar-protected-work-schema").then((module) => module.calendarProtectedWorkContract));
const eventContract = lazyContract(() => import("./calendar-schema").then((module) => module.calendarUpdateEventContract));
const suggestionsContract = lazyContract(() => import("./calendar-protected-work-schema").then((module) => module.calendarProtectedWorkSuggestionsContract));

export function useCalendarProtectedWork(enabled = true) {
  const { data: session } = useSession();
  const canRead = useCan("calendar:read");
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.protectedWork,
    queryFn: ({ signal }) => apiClient.get<CalendarProtectedWorkList>("/calendar/protected-work", {}, signal, listContract),
    enabled: Boolean(session?.orgId && session.user?.id) && canRead && enabled,
    staleTime: 30_000,
  });
}

export function useCalendarProtectedWorkSuggestions(protectedWorkId: number | null, enabled = true) {
  const { data: session } = useSession();
  const canRead = useCan("calendar:read");
  return useQuery({
    queryKey: [...platformHierarchyQueryKeys.calendar.protectedWork, protectedWorkId, "suggestions"],
    queryFn: ({ signal }) => apiClient.get<CalendarProtectedWorkSuggestions>(
      `/calendar/protected-work/${protectedWorkId}/suggestions`, {}, signal, suggestionsContract,
    ),
    enabled: Boolean(session?.orgId && session.user?.id && protectedWorkId !== null) && canRead && enabled,
    staleTime: 15_000,
  });
}

export function useRegisterCalendarProtectedWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.protectedWork, "register"],
    mutationFn: (input: {
      eventId: number;
      deadline: string;
      estimateMinutes: number;
      priority: number;
      locked: boolean;
      maxMovesPerDay: number;
      maxDailyMinutes: number;
    }) => apiClient.post<CalendarProtectedWork>(
      "/calendar/protected-work",
      input,
      { headers: { "Idempotency-Key": crypto.randomUUID() } },
      itemContract,
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.protectedWork }),
  });
}

export function useMoveCalendarProtectedWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.protectedWork, "move"],
    mutationFn: (input: {
      protectedWorkId: number;
      expectedVersion: number;
      expectedEventVersion: number;
      start: string;
      end: string;
    }) => apiClient.post<CalendarEvent>(
      `/calendar/protected-work/${input.protectedWorkId}/move`,
      {
        expectedVersion: input.expectedVersion,
        expectedEventVersion: input.expectedEventVersion,
        start: input.start,
        end: input.end,
      },
      { headers: { "Idempotency-Key": crypto.randomUUID() } },
      eventContract,
    ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.protectedWork });
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
    },
  });
}

export function useUndoCalendarProtectedWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...platformHierarchyQueryKeys.calendar.protectedWork, "undo"],
    mutationFn: (input: {
      protectedWorkId: number;
      expectedVersion: number;
      expectedEventVersion: number;
    }) => apiClient.post<CalendarEvent>(
      `/calendar/protected-work/${input.protectedWorkId}/undo`,
      { expectedVersion: input.expectedVersion, expectedEventVersion: input.expectedEventVersion },
      { headers: { "Idempotency-Key": crypto.randomUUID() } },
      eventContract,
    ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.protectedWork });
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.eventsAll });
    },
  });
}
