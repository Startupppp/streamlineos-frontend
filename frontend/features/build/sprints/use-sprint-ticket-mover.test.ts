import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { apiClient } from "@/lib/api-client";
import { bulkUpdateResultContract } from "@/hooks/api/build/build-tickets-schema";
import { useSprintTicketMover } from "./use-sprint-ticket-mover";

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn().mockResolvedValue({ updated: 0, ticketIds: [] }) },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
}));

const post = apiClient.post as jest.Mock;
const PROJECT_ID = 42;

/**
 * The fourth argument is the response contract. Asserting it resolves to the
 * real schema proves the bulk move is parsed, not cast — a bare arity match
 * would pass with the wrong contract wired.
 */
async function expectBulkContract(call: unknown[]): Promise<void> {
  expect(call).toHaveLength(4);
  const contract = call[3];
  expect(typeof contract).toBe("function");
  if (typeof contract !== "function") return;
  await expect(contract()).resolves.toBe(bulkUpdateResultContract);
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function renderMover() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderHook(() => useSprintTicketMover(PROJECT_ID), { wrapper: wrapper(client) });
}

beforeEach(() => {
  post.mockClear();
  post.mockResolvedValue({ updated: 0, ticketIds: [] });
});

describe("useSprintTicketMover", () => {
  it("moves a batch with one bulk request rather than one request per ticket", async () => {
    const { result } = renderMover();
    const ticketIds = Array.from({ length: 25 }, (_, i) => i + 1);

    await act(async () => {
      await result.current.moveTickets(ticketIds, 7);
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      `/build/${PROJECT_ID}/tickets/bulk`,
      { ticketIds, sprintId: 7 },
      undefined,
      expect.any(Function),
    );
    await expectBulkContract(post.mock.calls[0]);
  });

  it("sends sprintId null so a removal actually clears the sprint", async () => {
    const { result } = renderMover();

    await act(async () => {
      await result.current.moveTickets([1, 2], null);
    });

    expect(post).toHaveBeenCalledWith(
      `/build/${PROJECT_ID}/tickets/bulk`,
      { ticketIds: [1, 2], sprintId: null },
      undefined,
      expect.any(Function),
    );
    await expectBulkContract(post.mock.calls[0]);
  });

  it("splits a batch larger than the backend cap of 100 into bounded requests", async () => {
    const { result } = renderMover();
    const ticketIds = Array.from({ length: 230 }, (_, i) => i + 1);

    await act(async () => {
      await result.current.moveTickets(ticketIds, 7);
    });

    expect(post).toHaveBeenCalledTimes(3);
    for (const call of post.mock.calls) {
      expect(call[1].ticketIds.length).toBeLessThanOrEqual(100);
    }
    const sent = post.mock.calls.flatMap((call) => call[1].ticketIds);
    expect(sent).toEqual(ticketIds);
  });

  it("issues no request for an empty selection", async () => {
    const { result } = renderMover();

    await act(async () => {
      await result.current.moveTickets([], 7);
    });

    expect(post).not.toHaveBeenCalled();
  });

  it("propagates a failed batch instead of reporting success", async () => {
    post.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderMover();

    await expect(
      act(async () => {
        await result.current.moveTickets([1], 7);
      }),
    ).rejects.toThrow("boom");
  });
});
