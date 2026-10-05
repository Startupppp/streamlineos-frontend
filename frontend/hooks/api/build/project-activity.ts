"use client";

import type { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient, isApiError } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { projectActivityPageContract as projectActivityPageContractDef } from "@/hooks/api/build/build-tickets-subresource-schema";

const projectActivityPageLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.projectActivityPageContract,
  ),
);

type ProjectActivityPage = z.infer<typeof projectActivityPageContractDef>;

export function useProjectActivity(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.activity(projectId),
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.get<ProjectActivityPage>(
          `/build/${projectId}/activity`,
          { limit: 20 },
          signal,
          projectActivityPageLazy,
        );
      } catch (error) {
        if (!isApiError(error) || error.status !== 404) throw error;
        return {
          data: [],
          pagination: { limit: 20, hasMore: false, nextCursor: null },
        } satisfies ProjectActivityPage;
      }
    },
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
}
