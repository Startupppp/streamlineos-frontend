import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function hrDocumentTypesPageQueryOptions(cursor: string | undefined, limit: number) {
  const params = cursor ? { cursor, limit } : { limit };
  return {
    queryKey: [...humanResourcesQueryKeys.hr.documentTypes(), params] as const,
    staleTime: 30_000,
  } as const;
}
