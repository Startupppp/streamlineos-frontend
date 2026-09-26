"use client";

import type { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { projectActivityPageContract as projectActivityPageContractDef } from "@/hooks/api/build/build-tickets-subresource-schema";

const projectActivityPageLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then(
    (m) => m.projectActivityPageContract,
  ),
);

type ProjectActivityPage = z.infer<typeof projectActivityPageContractDef>;
export type ProjectActivityEntry = ProjectActivityPage["data"][number];

export function useProjectActivity(projectId: number) {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.activity(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectActivityPage>(
        `/build/${projectId}/activity`,
        { limit: 20 },
        signal,
        projectActivityPageLazy,
      ),
    enabled: canView && !!projectId,
    staleTime: 30_000,
  });
}
