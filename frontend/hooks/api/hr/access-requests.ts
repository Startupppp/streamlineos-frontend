"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { queryKeyBase } from "@/lib/query-keys/base";
import { useGatedQuery } from "@/hooks/api/gated-query";

const accessRequestListC = lazyContract(() =>
  import("@/hooks/api/hr/access-requests-schema").then((m) => m.accessRequestListContract),
);
const accessRequestC = lazyContract(() =>
  import("@/hooks/api/hr/access-requests-schema").then((m) => m.accessRequestContract),
);

export interface AccessRequest {
  id: string;
  orgId: string;
  employeeId: string;
  systemName: string;
  accessLevel: string;
  status: string;
  grantedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessRequestInput {
  employeeId: string;
  systemName: string;
  accessLevel: string;
}

export interface PatchAccessRequestInput {
  status: string;
  grantedBy?: string;
}

const AR_KEY = [...queryKeyBase, "hr", "access-requests"] as const;

export function useAccessRequests(employeeId?: string) {
  return useGatedQuery<AccessRequest[]>("hr:assets:view", {
    queryKey: humanResourcesQueryKeys.hr.hrAccessRequests({ employeeId }),
    queryFn: ({ signal }) =>
      apiClient.get<AccessRequest[]>("/hr/access-requests", employeeId ? { employeeId } : undefined, signal, accessRequestListC),
    staleTime: 60_000,
  });
}

export function useCreateAccessRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:assets:manage", {
    mutationKey: [...AR_KEY, "create"],
    mutationFn: (data: CreateAccessRequestInput) =>
      apiClient.post<AccessRequest>("/hr/access-requests", data, undefined, accessRequestC),
    onSuccess: () => qc.invalidateQueries({ queryKey: AR_KEY }),
  });
}

export function useUpdateAccessRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:assets:manage", {
    mutationKey: [...AR_KEY, "update"],
    mutationFn: ({ accessRequestId, ...data }: PatchAccessRequestInput & { accessRequestId: string }) =>
      apiClient.patch<AccessRequest>(`/hr/access-requests/${accessRequestId}`, data, undefined, accessRequestC),
    onSuccess: () => qc.invalidateQueries({ queryKey: AR_KEY }),
  });
}
