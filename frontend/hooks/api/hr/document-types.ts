"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const documentTypeLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-types-schema").then((m) => m.documentTypeContract),
);
const documentTypeListPageLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-types-schema").then((m) => m.documentTypeListPageContract),
);
import { useCan } from "@/hooks/api/access";

export interface HrDocumentType {
  id: number;
  name: string;
  slug?: string;
  description: string | null;
  countryCode: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
  createdAt?: string | null;
}

export interface PaginatedHrDocumentTypes {
  data: HrDocumentType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function unwrapDocumentTypes(
  res: PaginatedHrDocumentTypes | HrDocumentType[] | null | undefined,
): HrDocumentType[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray(res.data)) return res.data;
  return [];
}

export function useHrDocumentTypes(options?: { enabled?: boolean }) {
  const canManageDocuments = useCan("hr:documents:manage");
  const canViewDocuments = useCan("hr:documents:view");
  const canViewOwnDocuments = useCan("self:onboarding-docs");
  return useQuery<HrDocumentType[]>({
    enabled:
      (canManageDocuments || canViewDocuments || canViewOwnDocuments) &&
      (options?.enabled ?? true),
    queryKey: [...humanResourcesQueryKeys.hr.documentTypes(), "all"] as const,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<
        PaginatedHrDocumentTypes | HrDocumentType[]
      >("/hr/document-types", { page: 1, limit: 100 }, signal);
      return unwrapDocumentTypes(res);
    },
    staleTime: 5 * 60_000,
  });
}

export function useHrDocumentTypesPage(page: number, limit: number) {
  const canManageDocuments = useCan("hr:documents:manage");
  return useQuery<PaginatedHrDocumentTypes>({
    queryKey: [...humanResourcesQueryKeys.hr.documentTypes(), { page, limit }] as const,
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedHrDocumentTypes>("/hr/document-types", {
        page,
        limit,
      }, signal),
    enabled: canManageDocuments,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export interface HrDocumentTypeMutationInput {
  name?: string;
  description?: string;
  isMandatory?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  applicableRoles?: string[];
}

export function useCreateHrDocumentType() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documentTypes", "create"],
    mutationFn: ({
      name,
      description,
      isMandatory,
      sortOrder,
      applicableRoles,
    }: Required<Pick<HrDocumentTypeMutationInput, "name">> &
      HrDocumentTypeMutationInput) =>
      apiClient.post("/hr/document-types", {
        name,
        description,
        isMandatory,
        sortOrder,
        applicableRoles,
      }, undefined, documentTypeLazy),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.documentTypes(),
      }),
  });
}

export function useUpdateHrDocumentType() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documentTypes", "update"],
    mutationFn: ({
      documentTypeId,
      ...documentType
    }: HrDocumentTypeMutationInput & { documentTypeId: number }) =>
      apiClient.patch(`/hr/document-types/${documentTypeId}`, documentType, undefined, documentTypeLazy),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.documentTypes(),
      }),
  });
}

export function useDeactivateHrDocumentType() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "documentTypes", "deactivate"],
    mutationFn: (documentTypeId: number) =>
      apiClient.patch(`/hr/document-types/${documentTypeId}`, {
        isActive: false,
      }, undefined, documentTypeLazy),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.documentTypes(),
      }),
  });
}
