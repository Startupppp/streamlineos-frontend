import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function onboardingDocsSummaryQueryOptions(params: {
  cursor: string | undefined;
  limit: number;
  search?: string;
  status?: string;
}) {
  return {
    queryKey: humanResourcesQueryKeys.hr.onboardingDocsSummary(params),
    staleTime: 30_000,
  } as const;
}
