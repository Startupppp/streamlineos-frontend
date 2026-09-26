"use client";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useProjectBoardTickets, useTicketColumnCounts } from "./ticket-queries";

const forwardedSignal = new AbortController().signal;

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn((options: unknown) => options),
  useQuery: jest.fn((options: unknown) => options),
  useMemo: jest.requireActual("react").useMemo,
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: (effect: () => void) => effect(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const mockInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;

function useCaptureQueryOptions(projectId: number, filters?: Parameters<typeof useProjectBoardTickets>[1]) {
  mockInfiniteQuery.mockImplementation((opts: unknown) => opts);
  useProjectBoardTickets(projectId, filters);
  return mockInfiniteQuery.mock.calls.at(-1)?.[0] as {
    queryKey: unknown[];
    queryFn: (ctx: { pageParam: unknown; signal?: AbortSignal }) => unknown;
  };
}

describe("useProjectBoardTickets — server-side filter contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("carries status filter in the query key so different filter states get separate cache entries", () => {
    const opts = useCaptureQueryOptions(42, { status: "OPEN" });

    const keyStr = JSON.stringify(opts.queryKey);
    expect(keyStr).toContain("OPEN");
  });

  it("passes status as a server-side param, not applied client-side on a truncated set", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(42, { status: "OPEN,IN_PROGRESS" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/42/tickets",
      expect.objectContaining({ status: "OPEN,IN_PROGRESS" }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("passes text search as 'search' param (not applied client-side)", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(7, { q: "login bug" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/7/tickets",
      expect.objectContaining({ search: "login bug" }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("passes assigneeId filter to the server", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(7, { assigneeId: "user-1,user-2" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/7/tickets",
      expect.objectContaining({ assigneeId: "user-1,user-2" }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("passes cycle filter as cycleId to the server", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(5, { cycle: "3,4" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/5/tickets",
      expect.objectContaining({ cycleId: "3,4" }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("passes module filter as moduleIds to the server", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(5, { module: "10,11" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/5/tickets",
      expect.objectContaining({ moduleIds: "10,11" }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("does not include filter params in the API call when no filters are set", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(3);
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    const call = (apiClient.get as jest.Mock).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(call).not.toHaveProperty("status");
    expect(call).not.toHaveProperty("search");
    expect(call).not.toHaveProperty("assigneeId");
  });

  it("uses orderBy=rank and the board page size for the board endpoint when no sort filter is provided", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(1);
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/1/tickets",
      expect.objectContaining({ orderBy: "rank", orderDir: "asc", limit: 100 }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("uses the orderBy from the URL-backed sort filter so the sort param reaches the server rather than being dropped", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(1, { orderBy: "priority", orderDir: "desc" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/1/tickets",
      expect.objectContaining({ orderBy: "priority", orderDir: "desc" }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("includes orderBy in the query key so different sort orders get separate cache entries and do not collide", () => {
    const optsRank = useCaptureQueryOptions(5, { orderBy: "rank" });
    const optsCreated = useCaptureQueryOptions(5, { orderBy: "created" });

    expect(JSON.stringify(optsRank.queryKey)).not.toEqual(
      JSON.stringify(optsCreated.queryKey),
    );
  });

  it("does not fetch a next page until the caller explicitly requests it", () => {
    const fetchNextPage = jest.fn();
    mockInfiniteQuery.mockReturnValue({
      data: { pages: [{ data: [{ id: 1 }] }] },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    const result = useProjectBoardTickets(1);

    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.isTruncated).toBe(true);
    expect(fetchNextPage).not.toHaveBeenCalled();
    void result.fetchNextPage();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("passes due-date bounds to the server", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = useCaptureQueryOptions(7, {
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-01-31",
    });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/7/tickets",
      expect.objectContaining({
        dueDateFrom: "2026-01-01",
        dueDateTo: "2026-01-31",
      }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("does not request column counts when the board disables them with an empty project id", () => {
    useTicketColumnCounts(0);

    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("sends the board filter predicate to column counts", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ TODO: 2 });

    useTicketColumnCounts(7, {
      q: "login",
      status: "TODO,IN_PROGRESS",
      priority: "HIGH",
      cycle: "3",
    });

    const opts = mockQuery.mock.calls.at(-1)?.[0] as {
      queryKey: unknown[];
      queryFn: (ctx: { signal?: AbortSignal }) => unknown;
    };
    expect(JSON.stringify(opts.queryKey)).toContain("TODO,IN_PROGRESS");
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/7/tickets/column-counts",
      expect.objectContaining({
        search: "login",
        status: "TODO,IN_PROGRESS",
        priority: "HIGH",
        cycleId: "3",
      }),
      forwardedSignal,
      expect.any(Function),
    );
  });

  it("uses the project detail roster without mounting a duplicate members query", () => {
    const source = readFileSync(
      resolve(process.cwd(), "features", "build", "views", "use-board-url-state.ts"),
      "utf8",
    );

    expect(source).not.toContain("useProjectMembers");
    expect(source).toContain("data.members.flatMap");
  });
});
