"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { BuildScopeType } from "@/lib/build/build-scope";

export const BUILD_SCOPE_RESOLVE_LIMIT = 26;

export interface BuildScopeResolvedRef {
  key: string;
  type: BuildScopeType;
  id: string;
  name: string;
  parentKey: string | null;
  projectKey: string | null;
  isArchived: boolean;
  parentPath: string | null;
  clientPortalEnabled: boolean | null;
}

const scopeDirectoryResolveContract = lazyContract(() =>
  import("@/hooks/api/build/scope-directory-schema").then(
    (module) => module.scopeDirectoryResolveContract,
  ),
);

export function useBuildScopeResolve(keys: readonly string[]) {
  const canView = useCan("build:view");
  const bounded = keys.slice(0, BUILD_SCOPE_RESOLVE_LIMIT);
  return useQuery<{ data: BuildScopeResolvedRef[] }>({
    queryKey: buildWorkQueryKeys.projects.scopeDirectory.resolve(bounded),
    queryFn: ({ signal }) =>
      apiClient.post<{ data: BuildScopeResolvedRef[] }>(
        "/build/scope-directory/resolve",
        { keys: bounded },
        { signal },
        scopeDirectoryResolveContract,
      ),
    enabled: canView && bounded.length > 0,
    staleTime: 60_000,
    ...INLINE_READ_ERROR,
  });
}
