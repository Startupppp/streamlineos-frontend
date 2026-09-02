import { useQuery } from "@tanstack/react-query";
import { useQuotes } from "../quotes";

const forwardedSignal = new AbortController().signal;

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}));
jest.mock("@/hooks/api/gated-query", () => ({
  useGatedQuery: jest.fn((_key: unknown, options: unknown) => options),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({ getErrorMessage: jest.fn((e: unknown) => String(e)) }));
jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    crmQuotes: {
      all: ["streamlineos", "crm", "quotes"],
      list: (p?: unknown) => ["streamlineos", "crm", "quotes", "list", p],
      detail: (id: number) => ["streamlineos", "crm", "quotes", id],
      byDeal: (id: number) => ["streamlineos", "crm", "quotes", "deal", id],
    },
  },
}));

const mockGatedQuery = jest.requireMock("@/hooks/api/gated-query").useGatedQuery as jest.Mock;

function captureQuotesOptions(params?: Parameters<typeof useQuotes>[0]) {
  mockGatedQuery.mockImplementation((_key: unknown, opts: unknown) => opts);
  useQuotes(params);
  return mockGatedQuery.mock.calls.at(-1)?.[1] as { queryFn: (ctx: { signal: AbortSignal }) => unknown };
}

describe("useQuotes — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      quotes: [],
      hasMore: false,
      nextCursor: null,
    });

    const opts = captureQuotesOptions({ cursor: "eyJpZCI6MjB9", pageSize: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/quotes",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9" }),
      forwardedSignal,
    );
  });

  it("sends no cursor on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      quotes: [],
      hasMore: false,
      nextCursor: null,
    });

    const opts = captureQuotesOptions({ pageSize: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/quotes",
      expect.not.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      quotes: [],
      hasMore: true,
      nextCursor: "abc",
    });

    const opts = captureQuotesOptions({ pageSize: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/quotes",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
    );
  });

  it("BITES: fails when page is unexpectedly sent", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      quotes: [],
      hasMore: false,
      nextCursor: null,
    });

    const opts = captureQuotesOptions({ pageSize: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/quotes",
      expect.objectContaining({ page: expect.anything() }),
      forwardedSignal,
    );
  });
});
