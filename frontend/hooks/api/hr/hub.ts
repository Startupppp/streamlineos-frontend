"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HrHubSection, HrHubSnapshot } from "./hub-types";

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
    queryKey: humanResourcesQueryKeys.hr.hub(today),
    queryFn: ({ signal }) => apiClient.get<HrHubSnapshot>("/hr/hub", { today }, signal, lazyContract(() => import("@/hooks/api/hr/hub-schema").then(m => m.hrHubSnapshotContract))),
    enabled: Boolean(orgId && userId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: "always",
    refetchIntervalInBackground: false,
  });
}
