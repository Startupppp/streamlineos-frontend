"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Document, DocumentType } from "@/types/hr";

export interface HrDocumentListParams {
  page?: number;
  limit?: number;
  userId?: string;
  type?: DocumentType;
}

export interface HrDocumentListResponse {
  data: Document[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const hrDocumentListPrefix = [...queryKeys.hr.all, "documents"] as const;

export function useHrDocumentList(params?: HrDocumentListParams) {
  const queryParams: Record<string, unknown> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    ...(params?.userId ? { userId: params.userId } : {}),
    ...(params?.type ? { type: params.type } : {}),
  };
  return useQuery({
    queryKey: queryKeys.hr.documents(queryParams),
    queryFn: () => apiClient.get<HrDocumentListResponse>("/hr/documents", queryParams),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
