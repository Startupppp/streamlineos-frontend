import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function terminationListQueryOptions(params: {
  cursor: string;
  limit: number;
  status: string;
}) {
  return {
    queryKey: humanResourcesQueryKeys.hr.terminationList(params),
    staleTime: 2 * 60_000,
  } as const;
}
