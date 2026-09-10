import type { UseQueryResult } from "@tanstack/react-query";

function baseResult<TData>() {
  return {
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetchedAfterMount: false,
    isPaused: false,
    isRefetching: false,
    isStale: false,
    isEnabled: true,
    refetch: () => Promise.reject(new Error("refetch is not wired in this test")),
    promise: new Promise<TData>(() => undefined),
  };
}

/** A settled query a component can read from — every flag consistent with `status: "success"`. */
export function successQueryResult<TData>(data: TData): UseQueryResult<TData, Error> {
  return {
    ...baseResult<TData>(),
    data,
    error: null,
    status: "success",
    fetchStatus: "idle",
    isPlaceholderData: false,
    isSuccess: true,
    isError: false,
    isPending: false,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isFetching: false,
    isFetched: true,
    isInitialLoading: false,
  };
}

/** The first load, before any data exists — the state that must not render a denial. */
export function pendingQueryResult<TData>(): UseQueryResult<TData, Error> {
  return {
    ...baseResult<TData>(),
    data: undefined,
    error: null,
    status: "pending",
    fetchStatus: "fetching",
    isPlaceholderData: false,
    isSuccess: false,
    isError: false,
    isPending: true,
    isLoading: true,
    isLoadingError: false,
    isRefetchError: false,
    isFetching: true,
    isFetched: false,
    isInitialLoading: true,
  };
}
