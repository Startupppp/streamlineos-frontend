import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const CHARGED = {
  text: "summary",
  aiUsage: { model: "gpt-4o", promptTokens: 50, completionTokens: 100, totalTokens: 150, credits: 3 },
};

const FREE = { text: "summary", aiUsage: null };

/**
 * The wallet, the transaction ledger and the usage chart all hang off the
 * `billing/ai-credits` prefix, so one prefix invalidation has to reach all
 * three. A spend that leaves the wallet stale for five minutes shows the user a
 * balance that predates their own action.
 */
describe("an AI mutation that spends credits invalidates the credits keys", () => {
  const WALLET = queryKeys.billing.aiCredits();
  const LEDGER = queryKeys.billing.aiCreditTransactions({ limit: 20 });
  const USAGE = queryKeys.billing.aiCreditsUsage(30);

  function seed(client: QueryClient) {
    client.setQueryData(WALLET, { balance: 100 });
    client.setQueryData(LEDGER, { data: [], nextCursor: null });
    client.setQueryData(USAGE, { total: 0 });
  }

  function staleness(client: QueryClient) {
    return [WALLET, LEDGER, USAGE].map((key) => client.getQueryState(key)?.isInvalidated ?? null);
  }

  it("marks wallet, ledger and usage stale when the response carries a charge", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client);
    expect(staleness(client)).toEqual([false, false, false]);

    const { result } = renderHook(
      () => useMutation({ mutationFn: () => Promise.resolve(CHARGED) }),
      { wrapper: wrapper(client) },
    );
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(staleness(client)).toEqual([true, true, true]);
  });

  it("leaves them alone when the response carries no charge", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client);

    const { result } = renderHook(
      () => useMutation({ mutationFn: () => Promise.resolve(FREE) }),
      { wrapper: wrapper(client) },
    );
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(staleness(client)).toEqual([false, false, false]);
  });

  it("leaves them alone when the charge is zero credits", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client);

    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () =>
            Promise.resolve({ text: "cached", aiUsage: { totalTokens: 0, credits: 0 } }),
        }),
      { wrapper: wrapper(client) },
    );
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(staleness(client)).toEqual([false, false, false]);
  });

  it("does not fire on a mutation failure", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    seed(client);

    const { result } = renderHook(
      () => useMutation({ mutationFn: () => Promise.reject(new Error("boom")), retry: false }),
      { wrapper: wrapper(client) },
    );
    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    expect(staleness(client)).toEqual([false, false, false]);
  });
});

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), patch: jest.fn() },
  isApiError: () => false,
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock; patch: jest.Mock };
};

/**
 * The public board save is a settled self-write: the server confirms it and
 * returns its own `updatedAt`. Nothing else on the page can have changed the
 * scene, so the confirmed value belongs in the cache the read seeded from.
 */
describe("the public whiteboard save lands in the cache its read seeded from", () => {
  const TOKEN = "tok-1";
  const SCENE_ONE = { elements: [{ id: "a" }], appState: {}, files: {} };
  const SCENE_TWO = { elements: [{ id: "a" }, { id: "b" }], appState: {}, files: {} };

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({
      name: "Board",
      data: SCENE_ONE,
      access: "edit",
      allowExport: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    apiClient.patch.mockResolvedValue({ success: true, updatedAt: "2026-01-02T00:00:00.000Z" });
  });

  it("replaces the cached scene with the saved one and the server's updatedAt", async () => {
    const client = createAppQueryClient("unauthenticated");
    const { usePublicWhiteboard, useUpdatePublicWhiteboard } = await import(
      "./build/whiteboards-public"
    );

    const read = renderHook(() => usePublicWhiteboard(TOKEN), { wrapper: wrapper(client) });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(read.result.current.data?.data).toEqual(SCENE_ONE);

    const save = renderHook(() => useUpdatePublicWhiteboard(TOKEN), { wrapper: wrapper(client) });
    await act(async () => {
      await save.result.current.mutateAsync(SCENE_TWO);
    });

    const cached = client.getQueryData<{ data: unknown; updatedAt: string | null; name: string }>(
      queryKeys.whiteboards.publicLink(TOKEN),
    );
    expect(cached?.data).toEqual(SCENE_TWO);
    expect(cached?.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(cached?.name).toBe("Board");
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it("writes nothing when there was no cached read to update", async () => {
    const client = createAppQueryClient("unauthenticated");
    const { useUpdatePublicWhiteboard } = await import("./build/whiteboards-public");

    const save = renderHook(() => useUpdatePublicWhiteboard(TOKEN), { wrapper: wrapper(client) });
    await act(async () => {
      await save.result.current.mutateAsync(SCENE_TWO);
    });

    expect(client.getQueryData(queryKeys.whiteboards.publicLink(TOKEN))).toBeUndefined();
  });
});
