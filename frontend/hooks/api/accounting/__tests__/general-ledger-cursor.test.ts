import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useGeneralLedger } from "../core-gl";

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
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: jest.fn((e: unknown) => String(e)),
}));
jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    accounting: {
      all: ["streamlineos", "accounting"],
      apAll: ["streamlineos", "accounting", "ap"],
    },
  },
}));

const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;

function captureGeneralLedgerOptions(params: Parameters<typeof useGeneralLedger>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useGeneralLedger(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: (context: { signal?: AbortSignal }) => unknown };
}

describe("useGeneralLedger — cursor pagination contract", () => {
  const RANGE = { from: "2026-01-01", to: "2026-01-31" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  function stubLedger() {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      openingBalance: "0.00",
      closingBalance: "0.00",
      items: [],
      nextCursor: null,
    });
    return apiClient;
  }

  it("sends no cursor param on page 1", () => {
    const apiClient = stubLedger();
    const opts = captureGeneralLedgerOptions({ ...RANGE, limit: 50 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/general-ledger",
      expect.not.objectContaining({ cursor: expect.anything() }),
      undefined,
      expect.anything(),
    );
  });

  it("sends cursor on page 2", () => {
    const apiClient = stubLedger();
    const opts = captureGeneralLedgerOptions({ ...RANGE, cursor: "eyJpZCI6OTl9", limit: 50 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/general-ledger",
      expect.objectContaining({ cursor: "eyJpZCI6OTl9" }),
      undefined,
      expect.anything(),
    );
  });

  it("never sends page or pageSize — the ledger contract is cursor-only", () => {
    const apiClient = stubLedger();
    const opts = captureGeneralLedgerOptions({ ...RANGE, limit: 50 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/general-ledger",
      expect.not.objectContaining({ page: expect.anything() }),
      undefined,
      expect.anything(),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/general-ledger",
      expect.not.objectContaining({ pageSize: expect.anything() }),
      undefined,
      expect.anything(),
    );
  });

  it("BITES: a dropped cursor would fail this assertion", () => {
    const apiClient = stubLedger();
    const opts = captureGeneralLedgerOptions({ ...RANGE, cursor: "cursor-token", limit: 50 });
    void opts.queryFn({});

    const sent = (apiClient.get as jest.Mock).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(sent.cursor).toBe("cursor-token");
  });
});
