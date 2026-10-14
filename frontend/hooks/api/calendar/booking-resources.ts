"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useBookingScope } from "./booking-rules";
import type { BookingResource, BookingResourceMaintenance, BookingRuleResource } from "./booking-resources-schema";

const resourcesContract = lazyContract(() => import("./booking-resources-schema").then((module) => module.bookingResourcesContract));
const requirementsContract = lazyContract(() => import("./booking-resources-schema").then((module) => module.bookingRuleResourcesContract));
const resourceContract = lazyContract(() => import("./booking-resources-schema").then((module) => module.bookingResourceContract));
const maintenanceContract = lazyContract(() => import("./booking-resources-schema").then((module) => module.bookingResourceMaintenanceContract));

export interface CalendarResourceInput {
  kind: "room" | "equipment" | "resource";
  ownership: "calendar" | "source";
  sourceKey: string | null;
  sourceRecordId: string | null;
  name: string;
  location: string | null;
  capacity: number;
  divisible: boolean;
  accessibility: string[];
  requiresApproval: boolean;
}

export interface CalendarResourceUpdateInput {
  expectedVersion: number;
  name: string;
  location: string | null;
  capacity: number;
  divisible: boolean;
  accessibility: string[];
  requiresApproval: boolean;
  status: "active" | "unavailable" | "retired";
}

export function useCalendarBookingResources(enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.resources(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead),
    queryFn: ({ signal }) => apiClient.get<BookingResource[]>("/calendar/resources", undefined, signal, resourcesContract),
    enabled: enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCalendarBookingRuleResources(ruleId: number | null, enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.requirements(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId ?? 0),
    queryFn: ({ signal }) => apiClient.get<BookingRuleResource[]>(`/calendar/booking-rules/${ruleId}/resources`, undefined, signal, requirementsContract),
    enabled: enabled && ruleId !== null && Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateCalendarResource() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: calendarBookingQueryKeys.mutation("create-resource"),
    mutationFn: (input: CalendarResourceInput) => apiClient.post<BookingResource>("/calendar/resources", input, undefined, resourceContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useUpdateCalendarResource() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: calendarBookingQueryKeys.mutation("update-resource"),
    mutationFn: ({ id, input }: { id: number; input: CalendarResourceUpdateInput }) =>
      apiClient.put<BookingResource>(`/calendar/resources/${id}`, input, undefined, resourceContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useAddCalendarResourceMaintenance() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: calendarBookingQueryKeys.mutation("add-maintenance"),
    mutationFn: ({ id, startAt, endAt, reason }: { id: number; startAt: string; endAt: string; reason: string | null }) =>
      apiClient.post<BookingResourceMaintenance>(`/calendar/resources/${id}/maintenance`, { startAt, endAt, reason }, undefined, maintenanceContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}
