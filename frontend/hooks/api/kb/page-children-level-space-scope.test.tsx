"use client";

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { useKbPageChildrenLevel } from "./pages";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
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

describe("useKbPageChildrenLevel — tree-expand request scope", () => {
  let client: QueryClient;
  let getMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { get: jest.Mock };
    };
    getMock = apiClient.get;
    getMock.mockResolvedValue({
      data: [],
      pagination: { limit: 50, hasMore: false, nextCursor: null },
    });
  });

  it("BITE: carries spaceId on the tree-expand request when the parent tree is scoped to a space", async () => {
    renderHook(() => useKbPageChildrenLevel(9, true, 4), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    expect(getMock).toHaveBeenCalledWith(
      "/kb/pages/tree",
      expect.objectContaining({ parentId: 9, spaceId: 4 }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("positive control: omits spaceId from the request when the tree is not space-scoped", async () => {
    renderHook(() => useKbPageChildrenLevel(9, true), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    const params = getMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(params).not.toHaveProperty("spaceId");
    expect(params).toMatchObject({ parentId: 9 });
  });
});
