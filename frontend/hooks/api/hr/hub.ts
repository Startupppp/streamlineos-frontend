"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { HrHubSection, HrHubSnapshot } from "./hub-types";
import { localDateKey, hrHubQueryOptions } from "@/hooks/api/hr/hub-read-options";

export function hubSectionData<T>(
  section: HrHubSection<T> | null | undefined,
): T | undefined {
  return section?.status === "ok" ? section.data : undefined;
}

export function hubSectionError<T>(
  section: HrHubSection<T> | null | undefined,
): Error | null {
  return section?.status === "error" ? new Error(section.message) : null;
}

export function useHrHubSnapshot() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const userId = session?.user?.id;
  const today = localDateKey();

  return useQuery({
    ...hrHubQueryOptions(today),
    queryFn: ({ signal }) =>
      apiClient.get<HrHubSnapshot>(
        "/hr/hub",
        { today },
        signal,
        lazyContract(() =>
          import("@/hooks/api/hr/hub-schema").then((m) => m.hrHubSnapshotContract),
        ),
      ),
    enabled: Boolean(orgId && userId),
    refetchInterval: 60_000,
    refetchOnWindowFocus: "always",
    refetchIntervalInBackground: false,
    ...INLINE_READ_ERROR,
  });
}
