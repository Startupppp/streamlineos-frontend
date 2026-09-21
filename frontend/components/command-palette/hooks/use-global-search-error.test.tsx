import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useGlobalSearch } from "./use-global-search";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useGlobalSearch — a failed /search is not an empty result set", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("reports isError with the failure when GET /search rejects", async () => {
    mockedGet.mockRejectedValue(new Error("500 Internal Server Error"));

    const { result } = renderHook(() => useGlobalSearch("acme"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("reports isError false when GET /search resolves with zero results", async () => {
    mockedGet.mockResolvedValue({ results: [] });

    const { result } = renderHook(() => useGlobalSearch("acme"), { wrapper });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([]);
  });

  it("reports isError false for a query below the minimum length, which never runs", async () => {
    mockedGet.mockRejectedValue(new Error("500 Internal Server Error"));

    const { result } = renderHook(() => useGlobalSearch("a"), { wrapper });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("re-issues the request when retry is called after a failure", async () => {
    mockedGet.mockRejectedValue(new Error("500 Internal Server Error"));

    const { result } = renderHook(() => useGlobalSearch("acme"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    mockedGet.mockResolvedValue({
      results: [
        {
          id: 1,
          type: "lead",
          title: "Acme",
          subtitle: "Lead",
          href: "/crm/leads/1",
        },
      ],
    });
    result.current.retry();

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(result.current.isError).toBe(false);
  });
});
