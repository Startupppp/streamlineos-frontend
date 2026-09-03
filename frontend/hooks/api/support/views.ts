"use client";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type SavedViewVisibility = "personal" | "team" | "global";

export interface SupportSavedView {
  id: number;
  orgId: string;
  ownerId: string | null;
  name: string;
  filter: Record<string, unknown>;
  visibility: SavedViewVisibility;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export function useSupportSavedViews() {
  return useGatedQuery("support:tickets:view", {
    queryKey: queryKeys.supportViews.list(),
    queryFn: ({ signal }) => apiClient.get<SupportSavedView[]>("/support/views", undefined, signal),
    staleTime: 60_000,
  });
}

