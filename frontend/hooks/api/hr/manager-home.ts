"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { ManagerHome } from "@/hooks/api/hr/manager-home-schema";
import { managerHomeQueryOptions } from "./manager-home-read-options";

const managerHomeLazy = lazyContract(() => import("@/hooks/api/hr/manager-home-schema").then((m) => m.managerHomeContract));

export function useManagerHome() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery({
    ...managerHomeQueryOptions(),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiClient.get<ManagerHome>("/me/team", undefined, signal, managerHomeLazy),
    enabled: !!orgId,
  });
}
