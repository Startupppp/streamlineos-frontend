"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import type { ExcalidrawSceneData } from "./whiteboards";

const publicWhiteboardContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.publicWhiteboardContract),
);
const publicWhiteboardUpdateContract = lazyContract(() =>
  import("@/hooks/api/build/workspace-schema").then((m) => m.publicWhiteboardUpdateContract),
);

export interface PublicWhiteboard {
  name: string;
  data: unknown;
  access: "view" | "edit";
  allowExport: boolean;
  updatedAt: string;
}

export function usePublicWhiteboard(token: string) {
  return useQuery({
    queryKey: accountingAndSupportQueryKeys.whiteboards.publicLink(token),
    queryFn: ({ signal }) => apiClient.get<PublicWhiteboard>(`/public/whiteboard-links/${token}`, undefined, signal, publicWhiteboardContract),
    enabled: !!token,
    staleTime: 30_000,
    retry: false,
  });
}

export function useUpdatePublicWhiteboard(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["whiteboards", "public", "update"],
    mutationFn: (data: ExcalidrawSceneData) =>
      apiClient.patch<{ success: boolean; updatedAt: string }>(
        `/public/whiteboard-links/${token}`,
        { data },
        undefined,
        publicWhiteboardUpdateContract,
      ),
    onSuccess: (result, data) => {
      queryClient.setQueryData<PublicWhiteboard>(
        accountingAndSupportQueryKeys.whiteboards.publicLink(token),
        (previous) =>
          previous ? { ...previous, data, updatedAt: result.updatedAt } : previous,
      );
    },
  });
}
