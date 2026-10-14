"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useBookingScope } from "./booking-rules";
import type { RoutingHostCandidate, RoutingRule, RoutingRuleInput } from "./booking-routing-schema";

const routingContract = lazyContract(() => import("./booking-routing-schema").then((module) => module.routingRuleContract));
const hostCandidatesContract = lazyContract(() => import("./booking-routing-schema").then((module) => module.routingHostCandidatesContract));

export function useCalendarRoutingHosts(ruleId: number, search: string, enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.routingHosts(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId, search),
    queryFn: ({ signal }) => apiClient.get<RoutingHostCandidate[]>(`/calendar/booking-rules/${ruleId}/routing/hosts`, search ? { search } : undefined, signal, hostCandidatesContract),
    enabled: enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCalendarBookingRouting(ruleId: number) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.routing(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId),
    queryFn: async ({ signal }): Promise<RoutingRule | null> => {
      try {
        return await apiClient.get<RoutingRule>(`/calendar/booking-rules/${ruleId}/routing`, undefined, signal, routingContract);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(scope.orgId && scope.userId),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useSaveCalendarBookingRouting(ruleId: number) {
  const queryClient = useQueryClient();
  const scope = useBookingScope();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("routing"),
    mutationFn: (input: RoutingRuleInput) => apiClient.put<RoutingRule>(`/calendar/booking-rules/${ruleId}/routing`, input, undefined, routingContract),
    onSuccess: (value) => {
      queryClient.setQueryData(calendarBookingQueryKeys.routing(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId), value);
    },
  });
}
