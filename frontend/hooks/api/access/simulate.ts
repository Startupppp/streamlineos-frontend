"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import {
  simulatedAccessContract,
  simulationCandidatesPageContract,
  type SimulatedAccess,
  type SimulationCandidatesPage,
} from "@/hooks/api/roles-schema";

export type { SimulationCandidate } from "@/hooks/api/roles-schema";

export function useSimulationCandidates(search: string) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canManageRbac = useCan("settings:rbac:manage");
  const params = { limit: 100, ...(search ? { search } : {}) };
  return useQuery<SimulationCandidatesPage, Error>({
    queryKey: platformCoreQueryKeys.access.simulationCandidates(params),
    queryFn: ({ signal }) =>
      apiClient.get("/roles/simulate/candidates", params, signal, simulationCandidatesPageContract),
    enabled: !!orgId && canManageRbac,
    staleTime: 30_000,
  });
}

export function useSimulateAccess(targetUserId: string | undefined) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canManageRbac = useCan("settings:rbac:manage");
  return useQuery<SimulatedAccess, Error>({
    queryKey: platformCoreQueryKeys.access.simulate(targetUserId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get(`/roles/simulate/${targetUserId}`, undefined, signal, simulatedAccessContract),
    enabled: !!orgId && canManageRbac && !!targetUserId,
    staleTime: 30 * 1000,
  });
}
