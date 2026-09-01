"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
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
  return useGatedQuery<PaginatedCrmOrganizations>("crm:organizations:view", {
    queryKey: queryKeys.crmOrganizations.list(filters as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedCrmOrganizations>(
        "/crm/organizations",
        filters as Record<string, unknown>
      , signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCrmOrganizationsForPicker(search?: string) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.list({ picker: true, search: search ?? "" }),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedCrmOrganizations>("/crm/organizations", {
        page: 1,
        limit: 100,
        search: search ?? undefined,
      }, signal),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function useCrmOrganizationDetail(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.detail(id),
    queryFn: ({ signal }) => apiClient.get<CrmOrganization>(`/crm/organizations/${id}`, undefined, signal),
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
    queryFn: ({ signal }) => apiClient.get<OrgHierarchyNode>(`/crm/organizations/${id}/hierarchy`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmOrgRollup(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.rollup(id),
    queryFn: ({ signal }) => apiClient.get<OrgRollup>(`/crm/organizations/${id}/roll-up`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmOrgTimeline(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.timeline(id),
    queryFn: ({ signal }) => apiClient.get<OrgTimelineEvent[]>(`/crm/organizations/${id}/timeline`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmOrgRelatedLeads(id: number) {
  const canView = useCan("crm:organizations:view");
  return useQuery({
    queryKey: queryKeys.crmOrganizations.relatedLeads(id),
    queryFn: ({ signal }) => apiClient.get<RelatedLead[]>(`/crm/organizations/${id}/related-leads`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && id > 0,
  });
}

export function useCrmPeopleSlugs() {
  const canView = useCan("crm:contacts:view");
  return useQuery({
    queryKey: queryKeys.crm.peopleSlugs(),
    queryFn: ({ signal }) => apiClient.get<Record<string, string>>("/crm/people-slugs"),
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
