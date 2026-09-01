"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: queryKeys.supportViews.list(),
    queryFn: ({ signal }) => apiClient.get<SupportSavedView[]>("/support/views", undefined, signal),
    staleTime: 60_000,
  });
}

