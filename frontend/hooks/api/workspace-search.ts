"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface WorkspaceHit {
  entityType: string;
  entityId: number;
  title: string;
  snippet: string;
  urlPath: string;
  freshness: string;
}

export interface WorkspaceSearchResponse {
  hits: WorkspaceHit[];
  total: number;
  nextCursor: string | null;
}

export interface WorkspaceAskResponse {
  answer: string;
  citations: WorkspaceHit[];
  noPermittedSource: boolean;
}

interface SearchParams {
  q: string;
  entityTypes?: string[];
  limit?: number;
}

interface AskParams {
  q: string;
  entityTypes?: string[];
}

export function useWorkspaceSearch(params: SearchParams, enabled = true) {
  const { q, entityTypes, limit = 20 } = params;
  return useQuery({
    queryKey: queryKeys.workspaceSearch.search(q, entityTypes),
    queryFn: () => {
      const searchParams = new URLSearchParams({ q, limit: String(limit) });
      if (entityTypes?.length) {
        entityTypes.forEach((t) => searchParams.append("entityTypes[]", t));
      }
      return apiClient.get<WorkspaceSearchResponse>(`/workspace-search?${searchParams.toString()}`);
    },
    enabled: enabled && q.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useWorkspaceAsk() {
  return useMutation({
    mutationKey: ["workspace-search", "ask"],
    mutationFn: (params: AskParams) =>
      apiClient.post<WorkspaceAskResponse>("/workspace-search/ask", params),
  });
}

export function useWorkspaceAskFeedback() {
  return useMutation({
    mutationKey: ["workspace-search", "feedback"],
    mutationFn: (params: { feature: string; rating: "up" | "down"; context?: string }) =>
      apiClient.post<void>("/ai/feedback", params),
  });
}
