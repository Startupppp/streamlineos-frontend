"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useProjectBoardTickets } from "./ticket-queries";

const forwardedSignal = new AbortController().signal;

jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn((options: unknown) => options),
  useMemo: jest.requireActual("react").useMemo,
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
  useEffect: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const mockInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockCan = useCan as jest.Mock;

function captureQueryOptions(projectId: number, filters?: Parameters<typeof useProjectBoardTickets>[1]) {
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
    const opts = captureQueryOptions(42, { status: "OPEN" });

    const keyStr = JSON.stringify(opts.queryKey);
    expect(keyStr).toContain("OPEN");
  });

  it("passes status as a server-side param, not applied client-side on a truncated set", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = captureQueryOptions(42, { status: "OPEN,IN_PROGRESS" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/42/tickets",
      expect.objectContaining({ status: "OPEN,IN_PROGRESS" }),
      forwardedSignal,
    );
  });

  it("passes text search as 'search' param (not applied client-side)", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = captureQueryOptions(7, { q: "login bug" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/7/tickets",
      expect.objectContaining({ search: "login bug" }),
      forwardedSignal,
    );
  });

  it("passes assigneeId filter to the server", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = captureQueryOptions(7, { assigneeId: "user-1,user-2" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/7/tickets",
      expect.objectContaining({ assigneeId: "user-1,user-2" }),
      forwardedSignal,
    );
  });

  it("passes sprint filter as sprintIds to the server", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = captureQueryOptions(5, { sprint: "3,4" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/5/tickets",
      expect.objectContaining({ sprintIds: "3,4" }),
      forwardedSignal,
    );
  });

  it("passes module filter as moduleIds to the server", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = captureQueryOptions(5, { module: "10,11" });
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/5/tickets",
      expect.objectContaining({ moduleIds: "10,11" }),
      forwardedSignal,
    );
  });

  it("does not include filter params in the API call when no filters are set", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = captureQueryOptions(3);
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    const call = (apiClient.get as jest.Mock).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(call).not.toHaveProperty("status");
    expect(call).not.toHaveProperty("search");
    expect(call).not.toHaveProperty("assigneeId");
  });

  it("uses orderBy=rank and the board page size for the board endpoint", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], nextCursor: null });

    const opts = captureQueryOptions(1);
    void opts.queryFn({ pageParam: undefined, signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/1/tickets",
      expect.objectContaining({ orderBy: "rank", orderDir: "asc", limit: 100 }),
      forwardedSignal,
    );
  });
});
