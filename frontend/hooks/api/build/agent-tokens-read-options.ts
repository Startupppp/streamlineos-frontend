import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function agentTokensQueryOptions() {
  return {
    queryKey: buildWorkQueryKeys.projects.agentTokens(),
    staleTime: 60_000,
  } as const;
}
