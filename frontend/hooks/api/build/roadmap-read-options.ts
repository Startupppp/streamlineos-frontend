import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

export interface RoadmapItemFilters {
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  managedProductId?: number;
  sort?: string;
  projectId?: number;
  horizon?: string;
  ownerId?: number;
  goalId?: string;
  releaseId?: number;
  teamId?: string;
  opportunityId?: number;
  hasOpportunity?: boolean;
  confidenceMin?: number;
  confidenceMax?: number;
  targetFrom?: string;
  targetTo?: string;
  segment?: string;
  customerVisible?: boolean;
  evidenceState?: string;
}

export function roadmapItemsQueryOptions(filters: RoadmapItemFilters = {}) {
  const params: Record<string, unknown> = { ...filters };
  return {
    queryKey: knowledgeAndSurveysQueryKeys.roadmap.items(params),
    staleTime: 30_000,
  };
}
