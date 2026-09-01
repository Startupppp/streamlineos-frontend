"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  ProjectClientGrant,
  PortalMembershipsPage,
  ProjectClientGrantsPage,
  CreateGrantInput,
  UpdateGrantInput,
} from "@/types/portal-access/grants";

export function usePortalMemberships(params?: { cursor?: string; limit?: number; status?: string }) {
  const canView = useCan("build:portal:view");
  return useQuery<PortalMembershipsPage>({
    queryKey: queryKeys.portalAccess.memberships(params),
    queryFn: ({ signal }) => apiClient.get<PortalMembershipsPage>("/portal-access/memberships", { params }, signal),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useProjectClientGrants(params?: { cursor?: string; limit?: number; projectId?: number }) {
  const canView = useCan("build:portal:view");
  return useQuery<ProjectClientGrantsPage>({
    queryKey: queryKeys.portalAccess.grants(params),
    queryFn: ({ signal }) => apiClient.get<ProjectClientGrantsPage>("/portal-access/grants", { params }, signal),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useCreateGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["portalAccess", "grants", "create"],
    mutationFn: (data: CreateGrantInput) =>
      apiClient.post<ProjectClientGrant>("/portal-access/grants", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.portalAccess.grants() });
    },
  });
}

export function useUpdateGrant(projectClientGrantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["portalAccess", "grants", projectClientGrantId, "update"],
    mutationFn: (data: UpdateGrantInput) =>
      apiClient.patch<ProjectClientGrant>(
        `/portal-access/grants/${projectClientGrantId}`,
        data,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.portalAccess.grant(projectClientGrantId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.portalAccess.grants() });
    },
  });
}

export function useRevokeGrant(projectClientGrantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["portalAccess", "grants", projectClientGrantId, "revoke"],
    mutationFn: () =>
      apiClient.post<ProjectClientGrant>(
        `/portal-access/grants/${projectClientGrantId}/revoke`,
        {},
      ),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.portalAccess.grant(projectClientGrantId), updated);
      qc.invalidateQueries({ queryKey: queryKeys.portalAccess.grants() });
    },
  });
}
