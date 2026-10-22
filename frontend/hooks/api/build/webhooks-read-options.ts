import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface WebhookListFilters extends Record<string, unknown> {
  state?: "active" | "inactive";
  event?: string;
  q?: string;
  cursor?: number;
  from?: string;
  to?: string;
}

export function webhooksListQueryOptions(projectId: number, filters?: WebhookListFilters) {
  const hasFilters = filters !== undefined && Object.values(filters).some((v) => v !== undefined);
  const activeFilters = hasFilters ? filters : undefined;
  return {
    queryKey: buildWorkQueryKeys.projects.webhooks(projectId, activeFilters),
    staleTime: 30_000,
  };
}
