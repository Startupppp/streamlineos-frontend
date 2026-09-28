"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useProjectBoardTickets } from "./ticket-queries";

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn((options: unknown) => options),
  useQuery: jest.fn((options: unknown) => options),
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn() } }));

const mockInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockCan = useCan as jest.Mock;

type CapturedOptions = {
  queryKey: unknown[];
  initialPageParam: unknown;
  queryFn: (ctx: { pageParam: unknown; signal?: AbortSignal }) => unknown;
};

function useCapturedOptions(
  filters?: Parameters<typeof useProjectBoardTickets>[1],
): CapturedOptions {
  useProjectBoardTickets(42, filters);
  return mockInfiniteQuery.mock.calls.at(-1)?.[0] as CapturedOptions;
}

describe("useProjectBoardTickets — the URL cursor is where the page starts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockInfiniteQuery.mockImplementation((options: unknown) => options);
  });

  it("starts the first page at a deep-linked cursor, so a shared position is restorable", () => {
    expect(useCapturedOptions({ cursor: "c-900" }).initialPageParam).toBe("c-900");
  });

  it("starts at no cursor when the URL carries none, so every other consumer pages from the top", () => {
    expect(useCapturedOptions().initialPageParam).toBeUndefined();
    expect(useCapturedOptions({ status: "OPEN" }).initialPageParam).toBeUndefined();
  });

  it("sends the deep-linked cursor to the server on the first request, not only on the second", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], pagination: {} });

    const options = useCapturedOptions({ cursor: "c-900" });
    await options.queryFn({ pageParam: options.initialPageParam });

    expect((apiClient.get as jest.Mock).mock.calls.at(-1)?.[1]).toMatchObject({
      cursor: "c-900",
    });
  });

  it("keys the cache on the cursor, so a shared link is not answered by the top of the list", () => {
    expect(JSON.stringify(useCapturedOptions({ cursor: "c-900" }).queryKey)).toContain("c-900");
  });

  it("adds no cursor to the key of a consumer that passes none, so the board, backlog, triage and workload reads are unchanged", () => {
    expect(JSON.stringify(useCapturedOptions().queryKey)).not.toContain("cursor");
    expect(JSON.stringify(useCapturedOptions({ status: "OPEN" }).queryKey)).not.toContain("cursor");
  });
});
