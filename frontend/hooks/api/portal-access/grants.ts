"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useCan } from "@/hooks/api/access";
import type {
  ProjectClientGrant,
  PortalMembershipsPage,
  ProjectClientGrantsPage,
  CreateGrantInput,
  UpdateGrantInput,
} from "@/types/portal-access/grants";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const membershipListContract = lazyContract(() =>
  import("@/hooks/api/portal-access/portal-access-schema").then((m) => m.membershipListContract),
);
const grantListContract = lazyContract(() =>
  import("@/hooks/api/portal-access/portal-access-schema").then((m) => m.grantListContract),
);
const grantContract = lazyContract(() =>
  import("@/hooks/api/portal-access/portal-access-schema").then((m) => m.grantContract),
);

export function usePortalMemberships(params?: { cursor?: string; limit?: number; status?: string }) {
  const canView = useCan("build:portal:view");
  return useQuery<PortalMembershipsPage>({
    queryKey: directoryAndOwnershipQueryKeys.portalAccess.memberships(params),
    queryFn: ({ signal }) => apiClient.get<PortalMembershipsPage>("/portal-access/memberships", params, signal, membershipListContract),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useProjectClientGrants(params?: { cursor?: string; limit?: number; projectId?: number }) {
  const canView = useCan("build:portal:view");
  return useQuery<ProjectClientGrantsPage>({
    queryKey: directoryAndOwnershipQueryKeys.portalAccess.grants(params),
    queryFn: ({ signal }) => apiClient.get<ProjectClientGrantsPage>("/portal-access/grants", params, signal, grantListContract),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useCreateGrant() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["portalAccess", "grants", "create"],
    mutationFn: (data: CreateGrantInput) =>
      apiClient.post<ProjectClientGrant>("/portal-access/grants", data, undefined, grantContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.portalAccess.grants() });
    },
  });
}

export function useUpdateGrant(projectClientGrantId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["portalAccess", "grants", projectClientGrantId, "update"],
    mutationFn: (data: UpdateGrantInput) =>
      apiClient.patch<ProjectClientGrant>(
        `/portal-access/grants/${projectClientGrantId}`,
        data,
        undefined,
        grantContract,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(directoryAndOwnershipQueryKeys.portalAccess.grant(projectClientGrantId), updated);
      qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.portalAccess.grants() });
    },
  });
}

export function useRevokeGrant(projectClientGrantId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["portalAccess", "grants", projectClientGrantId, "revoke"],
    mutationFn: () =>
      apiClient.post<ProjectClientGrant>(
        `/portal-access/grants/${projectClientGrantId}/revoke`,
        {},
        undefined,
        grantContract,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(directoryAndOwnershipQueryKeys.portalAccess.grant(projectClientGrantId), updated);
      qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.portalAccess.grants() });
      qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.portal.all });
    },
  });
}
