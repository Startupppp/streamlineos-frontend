import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HrDocumentListParams, MyOnboardingDocStatus } from "./documents";

export function hrDocumentListQueryOptions(params?: HrDocumentListParams) {
  const queryParams: Record<string, unknown> = {
    limit: params?.limit ?? 20,
    ...(params?.cursor ? { cursor: params.cursor } : {}),
    ...(params?.userId ? { userId: params.userId } : {}),
    ...(params?.type ? { type: params.type } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.category && params.category !== "All Files"
      ? { category: params.category }
      : {}),
  };
  return {
    queryKey: humanResourcesQueryKeys.hr.documents(queryParams),
    staleTime: 60_000,
  } as const;
}

export function myOnboardingDocsQueryOptions(params: { limit: number; cursor?: string; status?: MyOnboardingDocStatus }) {
  return {
    queryKey: humanResourcesQueryKeys.hr.onboardingDocs(params),
    staleTime: 60_000,
  } as const;
}
