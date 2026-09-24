"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import type { ContentHealthSignalType } from "@/hooks/api/kb/content-health-schema";

const contentHealthSignalsContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.contentHealthSignalsContract),
);

const contentHealthCountsContract = lazyContract(() =>
  import("@/hooks/api/kb/content-health-schema").then((m) => m.contentHealthCountsContract),
);

export interface ContentHealthSignalsParams {
  signalType: ContentHealthSignalType;
  afterId?: number;
  limit?: number;
  spaceId?: number;
}

export function useContentHealthSignals(params: ContentHealthSignalsParams) {
  const canManage = useCan("kb:pages:manage");
  const queryParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: ["knowledge", "kb", "contentHealthSignals", queryParams] as const,
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/content-health/signals", queryParams, signal, contentHealthSignalsContract),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}

export function useContentHealthCounts() {
  const canManage = useCan("kb:pages:manage");
  return useQuery({
    queryKey: ["knowledge", "kb", "contentHealthCounts"] as const,
    queryFn: ({ signal }) =>
      apiClient.get("/kb/wiki/content-health/counts", undefined, signal, contentHealthCountsContract),
    staleTime: 2 * 60_000,
    enabled: canManage,
  });
}
