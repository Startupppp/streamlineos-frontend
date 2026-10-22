import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";

export const calendarSourcesQueryOptions = {
  queryKey: platformHierarchyQueryKeys.calendar.sources(),
  staleTime: 30_000,
} as const;

export const calendarAdminPolicyQueryOptions = {
  queryKey: ["calendar", "admin", "governance"] as const,
  staleTime: 30_000,
} as const;
