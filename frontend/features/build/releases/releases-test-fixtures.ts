import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useReleases } from "@/hooks/api/build/releases";
import { useAccess } from "@/hooks/api/access";
import type { AccessResponse } from "@/hooks/api/access-schema";
import type { Release } from "@/types/projects";

type AccessQueryResult = ReturnType<typeof useAccess>;

function successfulQuery<T>(data: T, dataUpdatedAt = 0): UseQueryResult<T, Error> {
  return {
    data,
    error: null,
    isError: false,
    isPending: false,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    status: "success",
    fetchStatus: "idle",
    dataUpdatedAt,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    isEnabled: true,
    refetch: async () => successfulQuery(data, dataUpdatedAt),
    promise: Promise.resolve(data),
  };
}

function failedQuery<T>(error: Error): UseQueryResult<T, Error> {
  return {
    data: undefined,
    error,
    isError: true,
    isPending: false,
    isLoading: false,
    isLoadingError: true,
    isRefetchError: false,
    isSuccess: false,
    status: "error",
    fetchStatus: "idle",
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 1,
    failureReason: error,
    errorUpdateCount: 1,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: true,
    isEnabled: true,
    refetch: async () => failedQuery<T>(error),
    promise: new Promise<T>(() => undefined),
  };
}

export function makeMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
  TContext = unknown,
>(): UseMutationResult<TData, TError, TVariables, TContext> {
  return {
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    status: "idle",
    variables: undefined,
    submittedAt: 0,
    isError: false,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    reset: jest.fn(),
  };
}

export const ACCESS_GRANTED: AccessQueryResult = successfulQuery<AccessResponse>({
  isOrgOwner: false,
  scopes: { "build:view": "all" },
  modules: {},
  canManageOrganizationMembership: false,
});
export const ACCESS_DENIED: AccessQueryResult = successfulQuery<AccessResponse>({
  isOrgOwner: false,
  scopes: {},
  modules: {},
  canManageOrganizationMembership: false,
});

type ReleaseQueryResult = ReturnType<typeof useReleases>;
type ReleasePage = NonNullable<ReleaseQueryResult["data"]>;
type ReleaseQueryOverrides =
  | { data?: ReleasePage; isError?: false; error?: null }
  | { data?: undefined; isError: true; error: Error };

export function baseQueryResult(
  overrides: ReleaseQueryOverrides = {},
): ReleaseQueryResult {
  if (overrides.isError) return failedQuery<ReleasePage>(overrides.error);
  const data: ReleasePage = overrides.data ?? cursorPage<Release>([]);
  return successfulQuery<ReleasePage>(data);
}

export function cursorPage<T>(items: T[]) {
  return { data: items, pagination: { limit: 25, hasMore: false, nextCursor: null } };
}

export const releaseRow = {
  id: 1,
  orgId: "org-1",
  projectId: 1,
  name: "v1.0.0",
  version: "1.0.0",
  rowVersion: 4,
  status: "draft" as const,
  releaseDate: null,
  publishedAt: null,
  readiness: null,
  riskLevel: null,
  ticketCount: 0,
  description: null,
  createdBy: null,
  createdByUser: null,
  deletedAt: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

export const OWNER_USER_ID = "user-7";
export const OWNER = {
  name: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
};
