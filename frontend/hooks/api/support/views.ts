"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useGatedQuery } from "@/hooks/api/gated-query";

const supportSavedViewListContract = lazyContract(() =>
  import("@/hooks/api/support/support-workspace-schema").then((m) => m.supportSavedViewListContract),
);

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
    queryKey: supportAndWorkflowsQueryKeys.supportViews.list(),
    queryFn: ({ signal }) => apiClient.get("/support/views", undefined, signal, supportSavedViewListContract),
    staleTime: 60_000,
  });
}

