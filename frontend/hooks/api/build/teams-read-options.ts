import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

interface TeamsListParams {
  cursor?: string;
  search?: string;
  pageSize?: number;
  leadId?: string;
  memberId?: string;
}

export function buildTeamsParams(params?: TeamsListParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params?.cursor) query["cursor"] = params.cursor;
  if (params?.pageSize) query["pageSize"] = String(params.pageSize);
  if (params?.search) query["search"] = params.search;
  if (params?.leadId) query["leadId"] = params.leadId;
  if (params?.memberId) query["memberId"] = params.memberId;
  return query;
}

export function teamsListQueryOptions(params?: TeamsListParams) {
  const query = buildTeamsParams(params);
  return {
    queryKey: buildWorkQueryKeys.projects.teams.list(Object.keys(query).length ? query : undefined),
    staleTime: 60_000,
  };
}
