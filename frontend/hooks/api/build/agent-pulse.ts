"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";

const agentPulseContract = lazyContract(() =>
  import("@/hooks/api/build/agent-pulse-schema").then((m) => m.agentPulseContract),
);

export function useAgentPulse() {
  const canView = useCan("build:approvals:view");
  return useQuery({
    enabled: canView,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryKey: buildWorkQueryKeys.projects.agentPulse(),
    queryFn: ({ signal }) =>
      apiClient.get("/build/agent-pulse/top-signal", undefined, signal, agentPulseContract),
  });
}
