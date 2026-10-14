"use client";

import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useBookingScope } from "./booking-rules";
import type { BookingInvitationPage, InvitationAction, ManagedBookingPage, RoutingAssignment } from "./managed-bookings-schema";

const bookingsContract = lazyContract(() => import("./managed-bookings-schema").then((module) => module.managedBookingsContract));
const assignmentContract = lazyContract(() => import("./managed-bookings-schema").then((module) => module.routingAssignmentContract));
const invitationsContract = lazyContract(() => import("./managed-bookings-schema").then((module) => module.bookingInvitationsContract));
const invitationActionContract = lazyContract(() => import("./managed-bookings-schema").then((module) => module.invitationActionContract));

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

export function useBookingInvitations(bookingId: string, cursor: string | null) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.invitations(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, bookingId, cursor),
    queryFn: ({ signal }) => apiClient.get<BookingInvitationPage>(`/calendar/bookings/${encodeURIComponent(bookingId)}/invitations`, cursor ? { cursor } : undefined, signal, invitationsContract),
    enabled: Boolean(scope.orgId && scope.userId && bookingId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useMarkBookingInvitationNoShow(bookingId: string) {
  const queryClient = useQueryClient();
  const scope = useBookingScope();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("invitation-no-show"),
    mutationFn: (invitationId: string) => apiClient.post<InvitationAction>(`/calendar/invitations/${encodeURIComponent(invitationId)}/no-show`, undefined, undefined, invitationActionContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.invitationsPrefix(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, bookingId) }),
  });
}
