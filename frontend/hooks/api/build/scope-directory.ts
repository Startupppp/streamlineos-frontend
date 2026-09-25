"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InfiniteData, UseInfiniteQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { BuildScopeType } from "@/lib/build/build-scope";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export const BUILD_SCOPE_RESOLVE_LIMIT = 26;
export const BUILD_SCOPE_SEARCH_LIMIT = 100;

export interface BuildScopeResolvedRef {
  key: string;
  type: Exclude<BuildScopeType, "organization">;
  id: string;
  name: string;
  parentKey: string | null;
  projectKey: string | null;
  isArchived: boolean;
  parentPath: string | null;
  clientPortalEnabled: boolean | null;
}

export interface BuildScopeSearchPage {
  data: BuildScopeResolvedRef[];
  nextCursor: string | null;
}

const scopeDirectoryResolveContract = lazyContract(() =>
  import("@/hooks/api/build/scope-directory-schema").then(
    (module) => module.scopeDirectoryResolveContract,
  ),
);

const scopeDirectorySearchContract = lazyContract(() =>
  import("@/hooks/api/build/scope-directory-schema").then(
    (module) => module.scopeDirectorySearchContract,
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

export function useInfiniteBuildScopeSearch(
  search: string,
  options?: Omit<
    UseInfiniteQueryOptions<
      BuildScopeSearchPage,
      Error,
      InfiniteData<BuildScopeSearchPage>,
      readonly unknown[],
      string | undefined
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >,
) {
  const canView = useCan("build:view");
  const { enabled: enabledOption, ...restOptions } = options ?? {};
  return useInfiniteQuery({
    queryKey: buildWorkQueryKeys.projects.scopeDirectory.search({
      q: search,
      limit: BUILD_SCOPE_SEARCH_LIMIT,
    }),
    queryFn: ({ pageParam, signal }) =>
      apiClient.get<BuildScopeSearchPage>(
        "/build/scope-directory/search",
        {
          q: search,
          limit: BUILD_SCOPE_SEARCH_LIMIT,
          ...(pageParam === undefined ? {} : { cursor: pageParam }),
        },
        signal,
        scopeDirectorySearchContract,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    ...restOptions,
    enabled: canView && search.length > 0 && (enabledOption ?? true),
    ...INLINE_READ_ERROR,
  });
}
