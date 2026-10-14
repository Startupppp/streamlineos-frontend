"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAccess } from "@/hooks/api/access";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import type {
  CalendarBookingIntakeField,
  CalendarBookingOffering,
  CalendarBookingRule,
  CalendarBookingWorkingHours,
} from "./booking-rules-schema";

const ruleContract = lazyContract(() => import("./booking-rules-schema").then((module) => module.bookingRuleContract));
const rulesContract = lazyContract(() => import("./booking-rules-schema").then((module) => module.bookingRulesContract));
const activationContract = lazyContract(() => import("./booking-rules-schema").then((module) => module.bookingRuleActivationContract));
const offeringContract = lazyContract(() => import("./booking-rules-schema").then((module) => module.bookingRuleOfferingContract));

export interface CalendarBookingRuleInput {
  title: string;
  description: string | null;
  durationMinutes: number;
  slotIntervalMinutes: number;
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  dailyLimit: number;
  timeZone: string;
  workingHours: CalendarBookingWorkingHours[];
  intakeFields: CalendarBookingIntakeField[];
  cancellationNoticeMinutes: number;
  rescheduleNoticeMinutes: number;
  requiresApproval: boolean;
  linkExpiresAt: string | null;
}

function useBookingScope() {
  const { data: session } = useSession();
  const { data: access } = useAccess();
  return {
    orgId: session?.orgId ?? "",
    userId: session?.user?.id ?? "",
    membershipId: access?.membershipId ?? null,
    accessVersion: access?.version ?? 0,
    canRead: grantsPermission(access, "calendar:read"),
  };
}

export function useCalendarBookingRules(enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.rules(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead),
    queryFn: ({ signal }) => apiClient.get<CalendarBookingRule[]>("/calendar/booking-rules", undefined, signal, rulesContract),
    enabled: enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateCalendarBookingRule() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("create"),
    mutationFn: (input: CalendarBookingRuleInput) => apiClient.post<CalendarBookingRule>("/calendar/booking-rules", input, undefined, ruleContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useUpdateCalendarBookingRule() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("update"),
    mutationFn: ({ id, expectedVersion, input }: { id: number; expectedVersion: number; input: CalendarBookingRuleInput }) =>
      apiClient.put<CalendarBookingRule>(`/calendar/booking-rules/${id}`, { ...input, expectedVersion }, undefined, ruleContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useActivateCalendarBookingRule() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("activate"),
    mutationFn: (id: number) => apiClient.post<{ rule: CalendarBookingRule; publicToken: string | null }>(`/calendar/booking-rules/${id}/activate`, undefined, undefined, activationContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useChangeCalendarBookingRuleStatus(action: "pause" | "revoke") {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation(action),
    mutationFn: (id: number) => apiClient.post<CalendarBookingRule>(`/calendar/booking-rules/${id}/${action}`, undefined, undefined, ruleContract),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useCalendarBookingRulePreview(ruleId: number | null, from: string, to: string, enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.preview(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId ?? 0, from, to),
    queryFn: ({ signal }) => apiClient.get<CalendarBookingOffering>(`/calendar/booking-rules/${ruleId}/preview`, { from, to }, signal, offeringContract),
    enabled: enabled && ruleId !== null && Boolean(scope.orgId && scope.userId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}
