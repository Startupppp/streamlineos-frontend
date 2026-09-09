"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { useUpdateKbPage } from "./pages";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrap({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("useUpdateKbPage — optimistic concurrency", () => {
  let client: QueryClient;
  let patchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { patch: jest.Mock };
    };
    patchMock = apiClient.patch;
  });

  it("sends expectedContentRevision to the server when provided", async () => {
    const updatedPage = { id: 1, contentRevision: 4, title: "T", orgId: "o" };
    patchMock.mockResolvedValueOnce(updatedPage);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        pageId: 1,
        content: { type: "doc" },
        expectedContentRevision: 3,
      });
    });

    expect(patchMock).toHaveBeenCalledWith(
      "/kb/pages/1",
      expect.objectContaining({ expectedContentRevision: 3 }),
      undefined,
      expect.any(Function),
    );
  });

  it("resolves with the updated page including the new contentRevision", async () => {
    const updatedPage = { id: 1, contentRevision: 4, title: "T", orgId: "o" };
    patchMock.mockResolvedValueOnce(updatedPage);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.mutateAsync({
        pageId: 1,
        content: { type: "doc" },
        expectedContentRevision: 3,
      });
    });

    expect((resolved as { contentRevision: number }).contentRevision).toBe(4);
  });

  it("surfaces a 409 conflict error and does not swallow it", async () => {
    const conflictErr = new ApiError(
      "Page was modified by another editor.",
      409,
      "STALE_REVISION",
    );
    patchMock.mockRejectedValueOnce(conflictErr);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    let caught: unknown;
    await act(async () => {
      caught = await result.current
        .mutateAsync({ pageId: 1, content: { type: "doc" }, expectedContentRevision: 2 })
        .catch((e: unknown) => e);
    });

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
  });

  it("always carries the precondition — an unguarded page write is not expressible", async () => {
    const updatedPage = { id: 2, contentRevision: 4, title: "U", orgId: "o" };
    patchMock.mockResolvedValueOnce(updatedPage);

    const { result } = renderHook(() => useUpdateKbPage(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        pageId: 2,
        title: "Updated",
        expectedContentRevision: 3,
      });
    });

    expect(patchMock).toHaveBeenCalledWith(
      "/kb/pages/2",
      expect.objectContaining({ expectedContentRevision: 3 }),
      undefined,
      expect.any(Function),
    );
  });
});
