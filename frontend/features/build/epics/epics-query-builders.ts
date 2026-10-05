import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { useProjectBoardTickets } from "@/hooks/api/build/ticket-queries";
import type { AccessResponse } from "@/hooks/api/access-schema";
import type { Ticket } from "@/types/projects";

export function pendingQuery<T>(): UseQueryResult<T, Error> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: true,
    isLoading: true,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: false,
    status: "pending",
    fetchStatus: "idle",
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: true,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: true,
    isEnabled: false,
    refetch: async () => pendingQuery<T>(),
    promise: new Promise<T>(() => undefined),
  };
}

export function successfulQuery<T>(data: T, dataUpdatedAt = 0): UseQueryResult<T, Error> {
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

export function failedQuery<T>(error: Error): UseQueryResult<T, Error> {
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

export const disabledQueryResult = <T = never>(): UseQueryResult<T, Error> => pendingQuery<T>();

export const ACCESS_LOADING: UseQueryResult<AccessResponse, Error> = pendingQuery<AccessResponse>();
export const ACCESS_GRANTED: UseQueryResult<AccessResponse, Error> = successfulQuery<AccessResponse>({
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  scopes: { "build:view": "all", "build:tickets:view": "all", "build:tickets:create": "all" },
  modules: { BUILD: true },
});
export const ACCESS_DENIED: UseQueryResult<AccessResponse, Error> = successfulQuery<AccessResponse>({
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  scopes: {},
  modules: { BUILD: true },
});

type BoardQueryResult = ReturnType<typeof useProjectBoardTickets>;

export function boardQueryResult(data: Ticket[]): BoardQueryResult {
  return {
    data,
    total: data.length,
    loadedCount: data.length,
    isTruncated: false,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isLoading: false,
    isPending: false,
    isLoadingError: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    isEnabled: true,
    status: "success",
    fetchStatus: "idle",
    fetchNextPage: jest.fn(),
    fetchPreviousPage: jest.fn(),
    hasNextPage: false,
    hasPreviousPage: false,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    isFetchPreviousPageError: false,
    isFetchingPreviousPage: false,
    refetch: jest.fn(),
    promise: new Promise<Awaited<BoardQueryResult["promise"]>>(() => undefined),
  };
}

export type MutationParts<T> = T extends UseMutationResult<infer Data, infer Error, infer Variables, infer Context>
  ? [Data, Error, Variables, Context]
  : never;

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
