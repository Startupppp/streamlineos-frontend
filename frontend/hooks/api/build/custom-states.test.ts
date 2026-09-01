import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import {
  useReorderCustomStates,
  useCustomStates,
  type CustomState,
} from "./custom-states";
import { queryKeys } from "@/lib/query-keys";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue([]),
    put: jest.fn().mockResolvedValue({ items: [] }),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
}));

function makeState(id: number, order: number): CustomState {
  return {
    id,
    orgId: "org-1",
    projectId: 42,
    name: `State ${id}`,
    color: null,
    order,
  };
}

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

function seedStates(client: QueryClient, states: CustomState[]) {
  client.setQueryData(queryKeys.projects.customStates(42), states);
}

function getStates(client: QueryClient): CustomState[] | undefined {
  return client.getQueryData<CustomState[]>(queryKeys.projects.customStates(42));
}

describe("useReorderCustomStates — bulk PUT endpoint", () => {
  let client: QueryClient;
  let putMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { put: jest.Mock; get: jest.Mock };
    };
    putMock = apiClient.put;
    putMock.mockResolvedValue({ items: [{ id: 1, order: 2 }, { id: 2, order: 1 }] });
    seedStates(client, [makeState(1, 1), makeState(2, 2), makeState(3, 3)]);
  });

  it("issues exactly one PUT request for a bulk reorder", async () => {
    const { result } = renderHook(
      () => useReorderCustomStates(42),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await result.current.mutateAsync([
        { stateId: 1, order: 2 },
        { stateId: 2, order: 1 },
      ]);
    });

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      "/build/42/custom-states",
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ stateId: 1, order: 2 }),
          expect.objectContaining({ stateId: 2, order: 1 }),
        ]),
      }),
    );
  });

  it("sends expectedOrder from the pre-mutation snapshot", async () => {
    const { result } = renderHook(
      () => useReorderCustomStates(42),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await result.current.mutateAsync([
        { stateId: 1, order: 2 },
        { stateId: 2, order: 1 },
      ]);
    });

    const [[, body]] = putMock.mock.calls as [[string, { items: { stateId: number; expectedOrder?: number }[] }]];
    const item1 = body.items.find((i) => i.stateId === 1);
    const item2 = body.items.find((i) => i.stateId === 2);
    expect(item1?.expectedOrder).toBe(1);
    expect(item2?.expectedOrder).toBe(2);
  });

  it("applies optimistic order update and reverts on 409", async () => {
    putMock.mockRejectedValueOnce(
      Object.assign(new Error("conflict"), { status: 409 }),
    );

    const { result } = renderHook(
      () => useReorderCustomStates(42),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync([
          { stateId: 1, order: 2 },
          { stateId: 2, order: 1 },
        ]);
      } catch {
      }
    });

    const states = getStates(client);
    const s1 = states?.find((s) => s.id === 1);
    const s2 = states?.find((s) => s.id === 2);
    expect(s1?.order).toBe(1);
    expect(s2?.order).toBe(2);
  });

  it("rolls back the complete order, not only conflicting rows", async () => {
    putMock.mockRejectedValueOnce(
      Object.assign(new Error("conflict"), {
        status: 409,
        conflicts: [{ stateId: 1, currentOrder: 1, expectedOrder: 1 }],
      }),
    );

    const { result } = renderHook(
      () => useReorderCustomStates(42),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync([
          { stateId: 1, order: 2 },
          { stateId: 2, order: 1 },
          { stateId: 3, order: 3 },
        ]);
      } catch {
      }
    });

    const states = getStates(client);
    expect(states?.find((s) => s.id === 1)?.order).toBe(1);
    expect(states?.find((s) => s.id === 2)?.order).toBe(2);
    expect(states?.find((s) => s.id === 3)?.order).toBe(3);
  });

  it("throws before the PUT when more than 50 items are supplied", async () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ stateId: i + 1, order: i + 1 }));

    const { result } = renderHook(
      () => useReorderCustomStates(42),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync(items);
      } catch {
      }
    });

    expect(putMock).not.toHaveBeenCalled();
  });
});

describe("useCustomStates — signal propagation", () => {
  it("passes abort signal to apiClient.get", async () => {
    const client = makeClient();
    const { apiClient } = jest.requireMock("@/lib/api-client") as {
      apiClient: { get: jest.Mock };
    };
    apiClient.get.mockResolvedValue([]);

    renderHook(() => useCustomStates(42), { wrapper: wrapper(client) });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/42/custom-states",
      undefined,
      expect.any(AbortSignal),
    );
  });
});
