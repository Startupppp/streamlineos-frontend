"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface HrDocumentType {
  id: number;
  name: string;
  description: string | null;
  countryCode: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
}

interface PaginatedDocumentTypes {
  data: HrDocumentType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function unwrapDocumentTypes(
  res: PaginatedDocumentTypes | HrDocumentType[] | null | undefined,
): HrDocumentType[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray(res.data)) return res.data;
  return [];
}

export function useHrDocumentTypes() {
  return useQuery<HrDocumentType[]>({
    queryKey: [...queryKeys.hr.documentTypes(), "all"] as const,
    queryFn: async () => {
      const res = await apiClient.get<PaginatedDocumentTypes>("/hr/document-types", {
        page: 1,
        limit: 100,
      });
      return unwrapDocumentTypes(res);
    },
    staleTime: 5 * 60_000,
  });
}
