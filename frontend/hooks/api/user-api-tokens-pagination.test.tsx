import type { ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useUserApiTokens } from "./user-api-tokens";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
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

    expect(mockedGet).toHaveBeenCalledWith("/me/api-tokens", {
      cursor: "current-cursor",
      limit: "50",
    }, expect.any(AbortSignal));
    expect(result.current.data).toEqual(response);
  });
});
