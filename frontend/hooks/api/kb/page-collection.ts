"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type { KbPageCollectionResponse } from "./kb-page-collection-schema";

export type { KbPageCollectionItem } from "./kb-page-collection-schema";
export type { KbPageCollectionResponse } from "./kb-page-collection-schema";

export interface KbPageCollectionParams {
  q?: string;
  spaceId?: number;
  projectId?: number;
  owner?: "me";
  sharedWithMe?: "1";
  status?: string;
  sort?: "updated_desc" | "created_desc" | "title_asc";
  cursor?: string;
  limit?: number;
}

const kbPageCollectionContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-page-collection-schema").then(
    (m) => m.kbPageCollectionContract,
  ),
);

export function useKbPageCollection(
  params: KbPageCollectionParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("kb:pages:view");

  const queryParams: Record<string, unknown> = {};
  if (params.q) queryParams.q = params.q;
  if (params.spaceId !== undefined) queryParams.spaceId = params.spaceId;
  if (params.projectId !== undefined) queryParams.projectId = params.projectId;
  if (params.owner) queryParams.owner = params.owner;
  if (params.sharedWithMe) queryParams.sharedWithMe = params.sharedWithMe;
  if (params.status) queryParams.status = params.status;
  if (params.sort) queryParams.sort = params.sort;
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.limit !== undefined) queryParams.limit = params.limit;

  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageCollection(params),
    queryFn: ({ signal }) =>
      apiClient.get<KbPageCollectionResponse>(
        "/kb/pages",
        queryParams,
        signal,
        kbPageCollectionContract,
      ),
    staleTime: 30_000,
    enabled: canView && (options?.enabled ?? true),
  });
}
