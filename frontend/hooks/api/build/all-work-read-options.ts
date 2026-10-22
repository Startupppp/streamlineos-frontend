import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { AllWorkFilters } from "@/types/projects";

export function allWorkQueryOptions(filters?: AllWorkFilters) {
  return {
    queryKey: buildWorkQueryKeys.projects.allWork(filters ? { ...filters } : undefined),
    staleTime: 30_000,
  };
}
