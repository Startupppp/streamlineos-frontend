"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  CrmOrganization,
  CrmOrganizationFilters,
  PaginatedCrmOrganizations,
  CreateCrmOrganizationInput,
  UpdateCrmOrganizationInput,
  OrgHierarchyNode,
  OrgRollup,
  OrgTimelineEvent,
  RelatedLead,
  MergeOrgsInput,
} from "@/types/crm";

export function useCrmOrganizations(filters?: CrmOrganizationFilters) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedCrmOrganizations>(
        "/crm/organizations",
        filters as Record<string, unknown>
      ),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useCrmOrganizationsForPicker(search?: string) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.list({ picker: true, search: search ?? "" }),
    queryFn: () =>
      apiClient.get<PaginatedCrmOrganizations>("/crm/organizations", {
        page: 1,
        limit: 100,
        search: search ?? undefined,
      }),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useCrmOrganizationDetail(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.detail(id),
    queryFn: () => apiClient.get<CrmOrganization>(`/crm/organizations/${id}`),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCreateCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmOrganizations", "create"] as const,
    mutationFn: (input: CreateCrmOrganizationInput) =>
      apiClient.post<CrmOrganization>("/crm/organizations", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
    },
  });
}

export function useUpdateCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmOrganizations", "update"] as const,
    mutationFn: ({ id, ...input }: UpdateCrmOrganizationInput & { id: number }) =>
      apiClient.patch<CrmOrganization>(`/crm/organizations/${id}`, input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.detail(variables.id) });
    },
  });
}

export function useDeleteCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmOrganizations", "delete"] as const,
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/organizations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
    },
  });
}

export function useCrmOrgHierarchy(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.hierarchy(id),
    queryFn: () => apiClient.get<OrgHierarchyNode>(`/crm/organizations/${id}/hierarchy`),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmOrgRollup(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.rollup(id),
    queryFn: () => apiClient.get<OrgRollup>(`/crm/organizations/${id}/roll-up`),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmOrgTimeline(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.timeline(id),
    queryFn: () => apiClient.get<OrgTimelineEvent[]>(`/crm/organizations/${id}/timeline`),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmOrgRelatedLeads(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.relatedLeads(id),
    queryFn: () => apiClient.get<RelatedLead[]>(`/crm/organizations/${id}/related-leads`),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmPeopleSlugs() {
  const canView = useCan("crm:contacts:view");
  return useQuery({
    queryKey: queryKeys.crm.peopleSlugs(),
    queryFn: () => apiClient.get<Record<string, string>>("/crm/people-slugs"),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export interface MergeOrgsResult {
  success: boolean;
  survivorId: number;
  mergedId: number;
  partyMergeId: string;
  conflicts: Record<string, { kept: unknown; discarded: unknown }>;
}

export function useMergeCrmOrganizations() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmOrganizations", "merge"] as const,
    mutationFn: (input: MergeOrgsInput) =>
      apiClient.post<MergeOrgsResult>("/crm/organizations/merge", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
      void qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.duplicates() });
    },
  });
}
