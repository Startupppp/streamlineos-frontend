"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useKbSpaces } from "./spaces";
import type { KbSearchParams } from "@/types/kb";
import type { KbSearchApiResponse } from "@/hooks/api/kb/kb-search-schema";

const kbSearchResponseContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-search-schema").then((m) => m.kbSearchResponseContract),
);

function deriveAclVersion(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(",");
}

export function useKbSearch(params: KbSearchParams, options?: { enabled?: boolean }) {
  const canViewArticles = useCan("kb:articles:view");
  const { data: spaces, isLoading: spacesLoading } = useKbSpaces();
  const aclVersion = spacesLoading
    ? null
    : deriveAclVersion((spaces ?? []).map((s) => s.id));
  const cacheParams: Record<string, unknown> = { ...params, aclVersion: aclVersion ?? "" };
  const apiParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.search(cacheParams),
    queryFn: ({ signal }) =>
      apiClient.get<KbSearchApiResponse>("/kb/search", apiParams, signal, kbSearchResponseContract),
    staleTime: 0,
    enabled:
      canViewArticles &&
      aclVersion !== null &&
      (options?.enabled ?? true) &&
      params.q.trim().length > 0,
  });
}
