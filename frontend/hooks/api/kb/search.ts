"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useKbSpaces } from "./spaces";
import type { KbSpaceListPage } from "./spaces";
import type { KbSearchParams } from "@/types/kb";
import type { KbSearchApiResponse, KbPageFullSearchResponse } from "@/hooks/api/kb/kb-search-schema";

const kbSearchResponseContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-search-schema").then((m) => m.kbSearchResponseContract),
);

const kbPageFullSearchResponseContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-search-schema").then((m) => m.kbPageFullSearchResponseContract),
);

const ACL_VERSION_SPACE_LIMIT = 100;

function deriveAclVersion(page: KbSpaceListPage | undefined): string {
  if (page === undefined) return "";
  const ids = page.data.map((s) => s.id).sort((a, b) => a - b);
  return page.pagination.hasMore ? `${ids.join(",")}~truncated` : ids.join(",");
}

export function useKbSearch(params: KbSearchParams, options?: { enabled?: boolean }) {
  const canViewArticles = useCan("kb:articles:view");
  const { data: spaces, isLoading: spacesLoading } = useKbSpaces({
    limit: ACL_VERSION_SPACE_LIMIT,
  });
  const aclVersion = spacesLoading ? null : deriveAclVersion(spaces);
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

export interface KbPageFullSearchParams {
  q: string;
  spaceId?: number;
  status?: string;
  verified?: boolean;
  facets?: boolean;
  limit?: number;
}

export function useKbPageFullSearch(
  params: KbPageFullSearchParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("kb:pages:view");
  const apiParams: Record<string, unknown> = { q: params.q };
  if (params.spaceId !== undefined) apiParams.spaceId = params.spaceId;
  if (params.status !== undefined) apiParams.status = params.status;
  if (params.verified !== undefined) apiParams.verified = params.verified;
  if (params.facets !== undefined) apiParams.facets = params.facets;
  if (params.limit !== undefined) apiParams.limit = params.limit;

  const cacheParams: Record<string, unknown> = {
    ...apiParams,
    _kind: "page-full-search",
  };

  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.search(cacheParams),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageFullSearchResponse>(
        "/kb/pages/full-search",
        apiParams,
        signal,
        kbPageFullSearchResponseContract,
      ),
    staleTime: 0,
    enabled:
      canView &&
      (options?.enabled ?? true) &&
      params.q.trim().length > 0,
  });
}
