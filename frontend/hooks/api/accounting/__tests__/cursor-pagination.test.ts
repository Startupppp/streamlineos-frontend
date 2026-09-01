import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useVendorCredits } from "../ap-vendors";
import { useBudgets } from "../planning";
import { useBankAccounts } from "../banking";
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
jest.mock("@/lib/get-error-message", () => ({ getErrorMessage: jest.fn((e: unknown) => String(e)) }));
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

function captureVendorCreditsOptions(params?: Parameters<typeof useVendorCredits>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useVendorCredits(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: () => unknown };
}

function captureBudgetsOptions(params?: Parameters<typeof useBudgets>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useBudgets(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: () => unknown };
}

function captureBankAccountsOptions(params?: Parameters<typeof useBankAccounts>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useBankAccounts(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: () => unknown };
}

function captureGeneralLedgerOptions(params: Parameters<typeof useGeneralLedger>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useGeneralLedger(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: () => unknown };
}

describe("useVendorCredits — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = captureVendorCreditsOptions({ limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.not.objectContaining({ cursor: expect.anything() }),
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = captureVendorCreditsOptions({ cursor: "eyJpZCI6MTB9", limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.objectContaining({ cursor: "eyJpZCI6MTB9" }),
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: "abc", hasMore: true },
    });

    const opts = captureVendorCreditsOptions({ limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.not.objectContaining({ page: expect.anything() }),
    );
  });

  it("BITES: fails when cursor is absent and test expects it", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = captureVendorCreditsOptions({ limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.objectContaining({ cursor: expect.anything() }),
    );
  });
});

describe("useBudgets — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = captureBudgetsOptions({ limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/budgets",
      expect.not.objectContaining({ cursor: expect.anything() }),
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = captureBudgetsOptions({ cursor: "eyJpZCI6NX0", limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/budgets",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: "tok", hasMore: true },
    });

    const opts = captureBudgetsOptions({ limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/budgets",
      expect.not.objectContaining({ page: expect.anything() }),
    );
  });
});

describe("useBankAccounts — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = captureBankAccountsOptions({ limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/finance/bank-accounts",
      expect.not.objectContaining({ cursor: expect.anything() }),
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = captureBankAccountsOptions({ cursor: "eyJpZCI6Mn0", limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/finance/bank-accounts",
      expect.objectContaining({ cursor: "eyJpZCI6Mn0" }),
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: "xyz", hasMore: true },
    });

    const opts = captureBankAccountsOptions({ limit: 20 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/finance/bank-accounts",
      expect.not.objectContaining({ page: expect.anything() }),
    );
  });
});

describe("useGeneralLedger — page/pageSize contract (NOT cursor-migrated)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends page and pageSize on first load", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const opts = captureGeneralLedgerOptions({ from: "2026-01-01", to: "2026-01-31", page: 1, pageSize: 50 });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/general-ledger",
      expect.objectContaining({ page: "1", pageSize: "50" }),
    );
  });

  it("never sends cursor", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const opts = captureGeneralLedgerOptions({ from: "2026-01-01", to: "2026-01-31" });
    void opts.queryFn();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/general-ledger",
      expect.not.objectContaining({ cursor: expect.anything() }),
    );
  });

  it("BITES: fails when cursor is expected", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const opts = captureGeneralLedgerOptions({ from: "2026-01-01", to: "2026-01-31" });
    void opts.queryFn();

    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/accounting/general-ledger",
      expect.objectContaining({ cursor: expect.anything() }),
    );
  });
});
