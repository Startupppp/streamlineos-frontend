import type { ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { apiClient } from "@/lib/api-client";
import { useRevokeUserApiToken, useUserApiTokens } from "./user-api-tokens";
import { userApiTokenPageContract } from "./user-api-tokens-schema";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() })),
  usePermissionGate: jest.fn((permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  })),
}));

const mockedGet = apiClient.get as jest.Mock;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useUserApiTokens pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the selected cursor and preserves its metadata", async () => {
    const response = {
      data: [],
      pagination: { limit: 50, hasMore: true, nextCursor: "next-cursor" },
    };
    mockedGet.mockResolvedValue(response);

    const { result } = renderHook(
      () => useUserApiTokens({ cursor: "current-cursor", limit: 50 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith(
      "/me/api-tokens",
      { cursor: "current-cursor", limit: "50" },
      expect.any(AbortSignal),
      userApiTokenPageContract,
    );
    expect(result.current.data).toEqual(response);
  });

  it("drops a revoked token from every cached page at once, even if the refetch still returns it", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);
    const token = { id: "t1", userId: "u", name: "ci", prefix: "sl_", scopes: [], expiresAt: null, lastUsedAt: null, createdAt: "2026-10-01T00:00:00Z" };
    const kept = { ...token, id: "t2", name: "kept" };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = usersAndCommerceQueryKeys.userApiTokens.list({ limit: 50 });
    client.setQueryData(key, { data: [token, kept], pagination: { limit: 50, hasMore: false, nextCursor: null } });
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(() => useRevokeUserApiToken(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync("t1");
    });

    expect(client.getQueryData<{ data: { id: string }[] }>(key)?.data.map((t) => t.id)).toEqual(["t2"]);
  });
});
