"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { ManagerHome } from "@/hooks/api/hr/manager-home-schema";

const managerHomeLazy = lazyContract(() => import("@/hooks/api/hr/manager-home-schema").then((m) => m.managerHomeContract));

export function useManagerHome() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.myTeam(),
    queryFn: ({ signal }) => apiClient.get<ManagerHome>("/me/team", undefined, signal, managerHomeLazy),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
