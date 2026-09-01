"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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

export function useUpdatePublicWhiteboard(token: string) {
  return useMutation({
    mutationKey: ["whiteboards", "public", "update"],
    mutationFn: (data: ExcalidrawSceneData) =>
      apiClient.patch<{ success: boolean; updatedAt: string | null }>(
        `/public/whiteboard-links/${token}`,
        { data },
      ),
  });
}
