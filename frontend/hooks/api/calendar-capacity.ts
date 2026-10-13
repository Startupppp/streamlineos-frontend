"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CalendarCapacity, CalendarResource } from "./calendar-capacity-schema";

const resourcesContract = lazyContract(() => import("./calendar-capacity-schema").then((module) => module.calendarResourceListContract));
const capacityContract = lazyContract(() => import("./calendar-capacity-schema").then((module) => module.calendarCapacityContract));

export function useCalendarResources(enabled = true) {
  const { data: session } = useSession();
  const canRead = useCan("calendar:read");
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.capacity(orgId, userId, { kind: "resources" }),
    queryFn: ({ signal }) => apiClient.get<CalendarResource[]>("/calendar/resources", undefined, signal, resourcesContract),
    enabled: enabled && Boolean(orgId && userId) && canRead,
    staleTime: 30_000,
  });
}

export function useCalendarCapacity(input: { resourceId: number; start: string; end: string; units: number } | null, enabled = true) {
  const { data: session } = useSession();
  const canRead = useCan("calendar:read");
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.capacity(orgId, userId, input ?? {}),
    queryFn: ({ signal }) => apiClient.get<CalendarCapacity>("/calendar/capacity", input ?? {}, signal, capacityContract),
    enabled: enabled && Boolean(input && orgId && userId) && canRead,
    staleTime: 15_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}
