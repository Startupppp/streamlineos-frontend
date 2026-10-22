import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function richDocumentDetailQueryOptions(documentId: number) {
  return {
    queryKey: humanResourcesQueryKeys.hr.richDocumentDetail(documentId),
    staleTime: 2 * 60_000,
  } as const;
}
