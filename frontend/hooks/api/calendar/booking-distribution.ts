"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { calendarBookingQueryKeys } from "@/lib/query-keys/calendar-booking";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useBookingScope } from "./booking-rules";
import type { BookingAccessLink, BookingDistribution, BookingDistributionOperations, CreatedBookingAccessLink } from "./booking-distribution-schema";

const distributionResponse = lazyContract(() => import("./booking-distribution-schema").then((module) => module.distributionContract));
const linksResponse = lazyContract(() => import("./booking-distribution-schema").then((module) => module.accessLinksContract));
const createdLinkResponse = lazyContract(() => import("./booking-distribution-schema").then((module) => module.createdAccessLinkContract));
const linkResponse = lazyContract(() => import("./booking-distribution-schema").then((module) => module.accessLinkContract));
const operationsResponse = lazyContract(() => import("./booking-distribution-schema").then((module) => module.distributionOperationsContract));

export type BookingDistributionInput = Pick<BookingDistribution,
  "defaultLocale" | "localizedCopy" | "branding" | "allowedOrigins" | "callbackFacts" | "intakeKeys" | "consentRequired" | "minimumCompletionSeconds" | "maximumSessionAttempts"
> & { expectedVersion: number | null };

export interface BookingAccessLinkInput {
  expectedDistributionVersion: number;
  channel: "page" | "embed";
  allowedOrigin: string | null;
  singleUse: boolean;
  expiresAt: string | null;
  attribution: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    term: string | null;
    referrerDomain: string | null;
  };
}

export function useBookingDistribution(ruleId: number) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.distribution(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId),
    queryFn: async ({ signal }): Promise<BookingDistribution | null> => {
      try {
        return await apiClient.get<BookingDistribution>(`/calendar/booking-rules/${ruleId}/distribution`, undefined, signal, distributionResponse);
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

export function useSaveBookingDistribution(ruleId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("distribution"),
    mutationFn: (input: BookingDistributionInput) => apiClient.put<BookingDistribution>(`/calendar/booking-rules/${ruleId}/distribution`, input, undefined, distributionResponse),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useBookingAccessLinks(ruleId: number, enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.links(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId),
    queryFn: ({ signal }) => apiClient.get<BookingAccessLink[]>(`/calendar/booking-rules/${ruleId}/distribution/links`, undefined, signal, linksResponse),
    enabled: enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useBookingDistributionOperations(ruleId: number, enabled = true) {
  const scope = useBookingScope();
  return useGatedQuery("calendar:read", {
    queryKey: calendarBookingQueryKeys.operations(scope.orgId, scope.userId, scope.membershipId, scope.accessVersion, scope.canRead, ruleId),
    queryFn: ({ signal }) => apiClient.get<BookingDistributionOperations>(`/calendar/booking-rules/${ruleId}/distribution/operations`, undefined, signal, operationsResponse),
    enabled: enabled && Boolean(scope.orgId && scope.userId),
    staleTime: 15_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateBookingAccessLink(ruleId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("create-link"),
    mutationFn: (input: BookingAccessLinkInput) => apiClient.post<CreatedBookingAccessLink>(`/calendar/booking-rules/${ruleId}/distribution/links`, input, undefined, createdLinkResponse),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}

export function useRevokeBookingAccessLink(ruleId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:write", {
    mutationKey: calendarBookingQueryKeys.mutation("revoke-link"),
    mutationFn: (linkId: string) => apiClient.post<BookingAccessLink>(`/calendar/booking-rules/${ruleId}/distribution/links/${encodeURIComponent(linkId)}/revoke`, undefined, undefined, linkResponse),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarBookingQueryKeys.all() }),
  });
}
