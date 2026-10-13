"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CalendarCoachInsight } from "./calendar-coach-schema";

const insightContract = lazyContract(() => import("./calendar-coach-schema").then((module) => module.calendarCoachInsightContract));
const consentContract = lazyContract(() => import("./calendar-coach-schema").then((module) => module.calendarCoachConsentContract));

export function useCalendarCoach(enabled = true) {
  const { data: session } = useSession();
  const canRead = useCan("calendar:read");
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.coach(orgId, userId),
    queryFn: ({ signal }) => apiClient.get<CalendarCoachInsight>("/calendar/coach", undefined, signal, insightContract),
    enabled: enabled && Boolean(orgId && userId) && canRead,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useUpdateCalendarCoachConsent() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: (input: { enabled: boolean; expectedVersion: number }) => apiClient.put<{ enabled: boolean; version: number; changedAt: string | null }>(
      "/calendar/coach/consent", input, undefined, consentContract,
    ),
    onSuccess: (consent) => {
      const key = platformHierarchyQueryKeys.calendar.coach(session?.orgId ?? "", session?.user?.id ?? "");
      if (!consent.enabled) qc.setQueryData<CalendarCoachInsight>(key, (current) => current ? {
        ...current,
        consent,
        coverage: "disabled",
        meetingMinutes: null,
        protectedWorkMinutes: null,
        missedCommitments: null,
        repeatedReschedules: null,
        overdueTasks: null,
        overdueBuildTickets: null,
        recommendations: [],
      } : current);
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}
