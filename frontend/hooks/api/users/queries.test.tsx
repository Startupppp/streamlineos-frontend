import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { useUsers, useUserStats } from "./queries";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const mockedGet = apiClient.get as jest.Mock;

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useUsers request hygiene", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it("passes teamId when provided", async () => {
    const client = createClient();
    renderHook(() => useUsers({ teamId: "team-abc-123" }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    const [, params] = mockedGet.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ teamId: "team-abc-123" });
  });

  it("passes managerUserId when provided", async () => {
    const client = createClient();
    renderHook(() => useUsers({ managerUserId: "mgr-xyz-456" }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    const [, params] = mockedGet.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ managerUserId: "mgr-xyz-456" });
  });

  it("passes both teamId and managerUserId together", async () => {
    const client = createClient();
    renderHook(() => useUsers({ teamId: "team-abc-123", managerUserId: "mgr-xyz-456" }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    const [, params] = mockedGet.mock.calls[0] as [string, Record<string, string>];
    expect(params).toMatchObject({ teamId: "team-abc-123", managerUserId: "mgr-xyz-456" });
  });

  it("omits teamId when not provided", async () => {
    const client = createClient();
    renderHook(() => useUsers({ search: "alice" }), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    const [, params] = mockedGet.mock.calls[0] as [string, Record<string, string>];
    expect(params).not.toHaveProperty("teamId");
    expect(params).not.toHaveProperty("managerUserId");
  });
});

describe("Members & Access read failures stay on the page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockRejectedValue(new Error("boom"));
  });

  function boundaryClient(): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, throwOnError: readErrorReachesBoundary },
        mutations: { retry: false },
      },
    });
  }

  it.each([
    ["useUsers", () => useUsers()],
    ["useUserStats", () => useUserStats()],
  ])(
    "%s surfaces a failed read inline instead of destroying the /settings segment boundary",
    async (_name, callHook) => {
      const client = boundaryClient();
      const { result } = renderHook(callHook, { wrapper: wrapperFor(client) });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    },
  );
});
