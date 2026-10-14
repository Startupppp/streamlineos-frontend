"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { isApiError } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";

const policyContract = z.object({
  enabled: z.boolean(),
  maxAgeDays: z.number().int().min(1).max(30),
  version: z.number().int().nonnegative(),
});

export function useCalendarOfflinePolicy(enabled = true) {
  const { data: session } = useSession();
  const canRead = useCan("calendar:read");
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  return useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.offlinePolicy(orgId, userId),
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<z.infer<typeof policyContract>>("/calendar/offline-policy", undefined, signal, policyContract);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return { enabled: false, maxAgeDays: 1, version: 0 };
        throw error;
      }
    },
    enabled: enabled && Boolean(orgId && userId) && canRead,
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}
