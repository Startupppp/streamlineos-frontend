"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR, optionalSignalRead } from "@/lib/query-error-policy";
import type { BuildScope } from "@/lib/build/build-scope";
import { buildScopeKey } from "@/lib/build/build-scope";

const agentPulseContract = lazyContract(() =>
  import("@/hooks/api/build/agent-pulse-schema").then((m) => m.agentPulseContract),
);

function buildScopeParams(scope: BuildScope): Record<string, unknown> {
  switch (scope.type) {
    case "project":
      return scope.projectId !== null ? { projectId: scope.projectId } : {};
    case "product":
      return scope.managedProductId !== null ? { managedProductId: scope.managedProductId } : {};
    default:
      return {};
  }
}

export function useAgentPulse(scope: BuildScope) {
  const canView = useCan("build:approvals:view");
  const scopeKey = buildScopeKey(scope);
  return useQuery({
    enabled: canView,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryKey: buildWorkQueryKeys.projects.agentPulse(scopeKey),
    queryFn: ({ signal }) =>
      optionalSignalRead(
        apiClient.get(
          "/build/agent-pulse/top-signal",
          buildScopeParams(scope),
          signal,
          agentPulseContract,
        ),
      ),
    ...INLINE_READ_ERROR,
  });
}
