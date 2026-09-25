"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import type { KbPageCollectionResponse } from "./kb-page-collection-schema";

export type { KbPageCollectionItem } from "./kb-page-collection-schema";
export type { KbPageCollectionResponse } from "./kb-page-collection-schema";

export const KB_PAGE_COLLECTION_QUERY_FIELDS = [
  "q",
  "spaceId",
  "projectId",
  "owner",
  "ownerMembershipId",
  "sharedWithMe",
  "status",
  "verified",
  "deleted",
  "sort",
  "cursor",
  "limit",
  "facets",
] as const;

export interface KbPageCollectionParams {
  q?: string;
  spaceId?: number;
  projectId?: number;
  owner?: "me";
  ownerMembershipId?: number;
  sharedWithMe?: "1";
  status?: string;
  verified?: boolean;
  deleted?: boolean;
  sort?: "updated_desc" | "created_desc" | "title_asc";
  cursor?: string;
  limit?: number;
  facets?: boolean;
}

const kbPageCollectionContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-page-collection-schema").then(
    (m) => m.kbPageCollectionContract,
  ),
);

export function buildKbPageCollectionQueryParams(
  params: KbPageCollectionParams,
): Record<string, unknown> {
  const queryParams: Record<string, unknown> = {};
  if (params.q) queryParams.q = params.q;
  if (params.spaceId !== undefined) queryParams.spaceId = params.spaceId;
  if (params.projectId !== undefined) queryParams.projectId = params.projectId;
  if (params.owner) queryParams.owner = params.owner;
  if (params.ownerMembershipId !== undefined)
    queryParams.ownerMembershipId = params.ownerMembershipId;
  if (params.sharedWithMe) queryParams.sharedWithMe = params.sharedWithMe;
  if (params.status) queryParams.status = params.status;
  if (params.verified !== undefined) queryParams.verified = params.verified;
  if (params.deleted !== undefined) queryParams.deleted = params.deleted;
  if (params.sort) queryParams.sort = params.sort;
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.limit !== undefined) queryParams.limit = params.limit;
  if (params.facets !== undefined) queryParams.facets = params.facets;
  return queryParams;
}

export function useKbPageCollection(
  params: KbPageCollectionParams,
  options?: { enabled?: boolean },
) {
  const canView = useCan("kb:pages:view");

  const queryParams = buildKbPageCollectionQueryParams(params);

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
