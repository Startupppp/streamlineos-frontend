"use client";

import { renderHook } from "@testing-library/react";
import { useKbPageChildrenLevel } from "./pages";

const mockUseInfiniteQuery = jest.fn((_options: unknown) => ({
  data: undefined,
  error: null,
  isError: false,
  isFetching: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
}));

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: (options: unknown) => mockUseInfiniteQuery(options),
  useQuery: jest.fn(() => ({ data: undefined })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
}));

describe("useKbPageChildrenLevel — error policy (FE-185)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isFetching: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });
  });

  it("passes throwOnError: false so a 500 error from the tree endpoint stays inline and does not propagate to the wiki error boundary, preventing a system failure after KB page creation", () => {
    renderHook(() => useKbPageChildrenLevel(9, true));

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ throwOnError: false }),
    );
  });

  it("positive control: still fires when enabled is true and canView is true so the query is not silently suppressed by the error policy change", () => {
    renderHook(() => useKbPageChildrenLevel(9, true));

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });
});
