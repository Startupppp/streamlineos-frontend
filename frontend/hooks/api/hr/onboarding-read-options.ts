import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function onboardingStatusPageQueryOptions(cursor: string | undefined, limit: number) {
  return {
    queryKey: humanResourcesQueryKeys.hr.onboardingStatusPage(cursor, limit),
    staleTime: 2 * 60_000,
  } as const;
}

export function onboardingUserQueryOptions(userId: string) {
  return {
    queryKey: humanResourcesQueryKeys.hr.onboardingUser(userId),
    staleTime: 60_000,
  } as const;
}
