"use client";

import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useBookingScope } from "./booking-rules";
import type { ManagedBookingPage, RoutingAssignment } from "./managed-bookings-schema";

const bookingsContract = lazyContract(() => import("./managed-bookings-schema").then((module) => module.managedBookingsContract));
const assignmentContract = lazyContract(() => import("./managed-bookings-schema").then((module) => module.routingAssignmentContract));

export function useManagedCalendarBookings(ruleId: number, cursor: string | null) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.bookings(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId, cursor),
    queryFn: ({ signal }) => apiClient.get<ManagedBookingPage>(`/calendar/booking-rules/${ruleId}/bookings`, cursor ? { cursor } : undefined, signal, bookingsContract),
    enabled: Boolean(scope.orgId && scope.userId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCalendarRoutingAssignment(ruleId: number, bookingId: string | null) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.assignment(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId, bookingId ?? ""),
    queryFn: async ({ signal }): Promise<RoutingAssignment | null> => {
      try {
        return await apiClient.get<RoutingAssignment>(`/calendar/booking-rules/${ruleId}/routing/assignments/${encodeURIComponent(bookingId ?? "")}`, undefined, signal, assignmentContract);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(scope.orgId && scope.userId && bookingId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}
