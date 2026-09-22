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
  useEffect: jest.fn(),
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

  it("uses orderBy=rank and the board page size for the board endpoint", () => {
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

  it("does not request column counts when the board disables them with an empty project id", () => {
    useTicketColumnCounts(0);

    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
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
