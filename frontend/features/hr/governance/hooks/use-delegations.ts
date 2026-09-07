"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const delegationsListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/delegations-schema").then((m) => m.delegationsListContract),
);
const proxyAccessContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/delegations-schema").then((m) => m.proxyAccessContract),
);
const proxyDeleteContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/delegations-schema").then((m) => m.proxyDeleteContract),
);

export interface ProxyAccess {
  id: number;
  orgId: string;
  grantorUserId: string;
  proxyUserId: string;
  scope: "approvals" | "hr_admin" | "manager_tasks";
  startsAt: string;
  endsAt: string;
  reason: string | null;
  active: boolean;
  disallowSensitive: boolean;
  createdAt: string;
}

export interface DelegationsListResponse {
  data: ProxyAccess[];
  total: number;
  page: number;
  limit: number;
}

const DELEGATIONS_KEY = ["hr", "governance", "delegations"] as const;

export function useOrgDelegations(params?: {
  scope?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}) {
  const canManageDelegations = useCan("hr:workflows:manage");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrDelegationsAll, "org", params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.scope) p["scope"] = params.scope;
      if (params?.active !== undefined) p["active"] = params.active;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get(
        "/hr/governance/delegations",
        p,
        signal,
        delegationsListContract,
      );
    },
    staleTime: 30_000,
    enabled: canManageDelegations,
  });
}

export function useGrantProxy() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    unknown,
    Error,
    {
      proxyUserId: string;
      scope: string;
      startsAt: string;
      endsAt: string;
      reason?: string;
      disallowSensitive?: boolean;
    }
  >("hr:workflows:view", {
    mutationKey: [...DELEGATIONS_KEY, "grant"],
    mutationFn: (payload) =>
      apiClient.post("/hr/governance/delegations", payload, undefined, proxyAccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELEGATIONS_KEY });
      toast.success("Proxy access granted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useRevokeProxy() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:workflows:view", {
    mutationKey: [...DELEGATIONS_KEY, "revoke"],
    mutationFn: (proxyId) =>
      apiClient.delete(`/hr/governance/delegations/${proxyId}`, undefined, undefined, proxyDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DELEGATIONS_KEY });
      toast.success("Proxy access revoked");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
