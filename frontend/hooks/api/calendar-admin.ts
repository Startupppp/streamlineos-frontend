"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CalendarAdminPolicy,
  CalendarAnalytics,
  CalendarExportPolicy,
  CalendarProviderWriteScope,
} from "./calendar-admin-schema";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const policyContract = lazyContract(() => import("./calendar-admin-schema").then((module) => module.calendarAdminPolicyContract));
const analyticsContract = lazyContract(() => import("./calendar-admin-schema").then((module) => module.calendarAnalyticsContract));
const revocationContract = lazyContract(() => import("./calendar-admin-schema").then((module) => module.calendarLinkRevocationContract));

const keys = {
  policy: ["calendar", "admin", "governance"] as const,
  analytics: ["calendar", "admin", "analytics"] as const,
};

export interface CalendarAdminPolicyInput {
  expectedVersion: number;
  analyticsTimeZone: string;
  minimumAnalyticsCohort: number;
  analyticsRetentionDays: number;
  exportPolicy: CalendarExportPolicy;
  providerWriteScope: CalendarProviderWriteScope;
  allowedBookingDomains: string[];
  publicLinksEnabled: boolean;
  defaultLinkExpiryDays: number;
  minimumCompletionSeconds: number;
  maximumSessionAttempts: number;
  maximumActiveLinks: number;
  offlineBusyCacheEnabled: boolean;
  offlineBusyCacheMaxAgeDays: number;
}

export function useCalendarAdminPolicy() {
  return useGatedQuery("calendar:admin:manage", {
    queryKey: keys.policy,
    queryFn: ({ signal }) => apiClient.get<CalendarAdminPolicy>("/calendar/admin/governance", undefined, signal, policyContract),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useCalendarAnalytics(from: string, to: string) {
  return useGatedQuery("calendar:admin:manage", {
    queryKey: [...keys.analytics, from, to],
    queryFn: ({ signal }) => apiClient.get<CalendarAnalytics>("/calendar/admin/analytics", { from, to }, signal, analyticsContract),
    staleTime: 30_000,
    ...INLINE_READ_ERROR,
  });
}

export function useUpdateCalendarAdminPolicy() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "admin", "update-governance"],
    mutationFn: (input: CalendarAdminPolicyInput) => apiClient.patch<CalendarAdminPolicy>("/calendar/admin/governance", input, undefined, policyContract),
    onSuccess: (policy) => {
      queryClient.setQueryData(keys.policy, policy);
      void queryClient.invalidateQueries({ queryKey: keys.analytics });
      void queryClient.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
    },
  });
}

export function useRevokeAllCalendarLinks() {
  return useAuthorizedMutation("calendar:admin:manage", {
    mutationKey: ["calendar", "admin", "revoke-all-links"],
    mutationFn: () => apiClient.post<{ revokedLinks: number; revokedAt: string }>("/calendar/admin/links/revoke-all", undefined, undefined, revocationContract),
  });
}
