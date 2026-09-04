"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { ExcalidrawSceneData } from "./whiteboards";

export interface PublicWhiteboard {
  name: string;
  data: ExcalidrawSceneData;
  access: "view" | "edit";
  allowExport: boolean;
  updatedAt: string | null;
}

export function usePublicWhiteboard(token: string) {
  return useQuery({
    queryKey: queryKeys.whiteboards.publicLink(token),
    queryFn: ({ signal }) => apiClient.get<PublicWhiteboard>(`/public/whiteboard-links/${token}`, undefined, signal),
    enabled: !!token,
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * The save writes the scene the caller already holds, and the read that seeded
 * the canvas sits at a 30s staleTime under the same key. Without this the cache
 * keeps the pre-save scene: a remount inside the window re-seeds Excalidraw from
 * it, and a refetch after the window races the 3s debounce. The server confirms
 * the write and returns its own `updatedAt`, so this is a settled self-write —
 * no onMutate, no rollback.
 */
export function useUpdatePublicWhiteboard(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["whiteboards", "public", "update"],
    mutationFn: (data: ExcalidrawSceneData) =>
      apiClient.patch<{ success: boolean; updatedAt: string | null }>(
        `/public/whiteboard-links/${token}`,
        { data },
      ),
    onSuccess: (result, data) => {
      queryClient.setQueryData<PublicWhiteboard>(
        queryKeys.whiteboards.publicLink(token),
        (previous) =>
          previous ? { ...previous, data, updatedAt: result.updatedAt } : previous,
      );
    },
  });
}
