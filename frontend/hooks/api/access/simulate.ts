"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { DataScope } from "@/types/access";

interface SimulateAccessResult {
  userId: string;
  permissions: string[];
  scopes: Record<string, DataScope>;
  isOrgOwner: boolean;
}

export interface SimulationCandidate {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  designation: string | null;
}

interface SimulationCandidatesResult {
  data: SimulationCandidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useSimulationCandidates(search: string) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canManageRbac = useCan("settings:rbac:manage");
  const params = { page: 1, limit: 100, ...(search ? { search } : {}) };
  return useQuery<SimulationCandidatesResult, Error>({
    queryKey: queryKeys.access.simulationCandidates(params),
    queryFn: () =>
      apiClient.get<SimulationCandidatesResult>("/roles/simulate/candidates", params),
    enabled: !!orgId && canManageRbac,
    staleTime: 30_000,
  });
}

export function useSimulateAccess(targetUserId: string | undefined) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canManageRbac = useCan("settings:rbac:manage");
  return useQuery<SimulateAccessResult, Error>({
    queryKey: queryKeys.access.simulate(targetUserId ?? ""),
    queryFn: () =>
      apiClient.get<SimulateAccessResult>(`/roles/simulate/${targetUserId}`),
    enabled: !!orgId && canManageRbac && !!targetUserId,
    staleTime: 30 * 1000,
  });
}
