import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";

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

/**
 * A gated read that is not running — `enabled: false`, so it never resolves.
 *
 * Distinct from `pendingQueryResult` and the distinction is the point: a
 * disabled Query v5 read is `isPending: true, isFetching: false`, so `isLoading`
 * is FALSE. That is the state FE-47 is about — indistinguishable from an empty
 * list unless the caller reads the denial separately.
 */
export function idleQueryResult<TData>(): UseQueryResult<TData, Error> {
  return {
    ...baseResult<TData>(),
    data: undefined,
    error: null,
    status: "pending",
    fetchStatus: "idle",
    isPlaceholderData: false,
    isSuccess: false,
    isError: false,
    isPending: true,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isFetching: false,
    isFetched: false,
    isInitialLoading: false,
  };
}

/** A read that failed, so a spec can assert the error branch rather than an empty one. */
export function errorQueryResult<TData>(error: Error): UseQueryResult<TData, Error> {
  return {
    ...baseResult<TData>(),
    data: undefined,
    error,
    status: "error",
    fetchStatus: "idle",
    isPlaceholderData: false,
    isSuccess: false,
    isError: true,
    isPending: false,
    isLoading: false,
    isLoadingError: true,
    isRefetchError: false,
    isFetching: false,
    isFetched: true,
    isInitialLoading: false,
  };
}

/**
 * The paging half, inlined rather than spread from a helper: these flags are
 * literal `false` in the observer's result types, and a spread widens them to
 * `boolean`, which no member of the union accepts.
 */
const infinitePaging = {
  fetchNextPage: () => Promise.reject(new Error("fetchNextPage is not wired in this test")),
  fetchPreviousPage: () =>
    Promise.reject(new Error("fetchPreviousPage is not wired in this test")),
  hasPreviousPage: false as const,
  isFetchingNextPage: false as const,
  isFetchingPreviousPage: false as const,
  isFetchNextPageError: false as const,
  isFetchPreviousPageError: false as const,
};

/** A settled infinite query holding `pages`, with the page params a real cursor walk produces. */
export function successInfiniteQueryResult<TPage>(
  pages: TPage[],
  pageParams: unknown[] = pages.map((_, index) => (index === 0 ? undefined : index)),
  hasNextPage = false,
): UseInfiniteQueryResult<InfiniteData<TPage, unknown>, Error> {
  return {
    ...baseResult<InfiniteData<TPage, unknown>>(),
    ...infinitePaging,
    hasNextPage,
    data: { pages, pageParams },
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

/** The infinite counterpart of `idleQueryResult` — gated off, never run, no pages. */
export function idleInfiniteQueryResult<TPage>(): UseInfiniteQueryResult<
  InfiniteData<TPage, unknown>,
  Error
> {
  return {
    ...baseResult<InfiniteData<TPage, unknown>>(),
    ...infinitePaging,
    hasNextPage: false,
    data: undefined,
    error: null,
    status: "pending",
    fetchStatus: "idle",
    isPlaceholderData: false,
    isSuccess: false,
    isError: false,
    isPending: true,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isFetching: false,
    isFetched: false,
    isInitialLoading: false,
  };
}
