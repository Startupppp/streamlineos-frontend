import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useVendorCredits } from "../ap-vendors";
import { useBudgets } from "../planning";
import { useBankAccounts } from "../banking";
import { useGeneralLedger } from "../core-gl";

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

function useCaptureVendorCreditsOptions(params?: Parameters<typeof useVendorCredits>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useVendorCredits(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: (context: { signal?: AbortSignal }) => unknown };
}

function useCaptureBudgetsOptions(params?: Parameters<typeof useBudgets>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useBudgets(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: (context: { signal?: AbortSignal }) => unknown };
}

function useCaptureBankAccountsOptions(params?: Parameters<typeof useBankAccounts>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useBankAccounts(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: (context: { signal?: AbortSignal }) => unknown };
}

function useCaptureGeneralLedgerOptions(params: Parameters<typeof useGeneralLedger>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useGeneralLedger(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: (context: { signal?: AbortSignal }) => unknown };
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

    const opts = useCaptureVendorCreditsOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.not.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = useCaptureVendorCreditsOptions({ cursor: "eyJpZCI6MTB9", limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.objectContaining({ cursor: "eyJpZCI6MTB9" }),
      forwardedSignal,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: "abc", hasMore: true },
    });

    const opts = useCaptureVendorCreditsOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
    );
  });

  it("BITES: fails when cursor is absent and test expects it", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = useCaptureVendorCreditsOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/accounting/vendor-credits",
      expect.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
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

    const opts = useCaptureBudgetsOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/budgets",
      expect.not.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = useCaptureBudgetsOptions({ cursor: "eyJpZCI6NX0", limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/budgets",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
      forwardedSignal,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: "tok", hasMore: true },
    });

    const opts = useCaptureBudgetsOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/accounting/budgets",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
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

    const opts = useCaptureBankAccountsOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/finance/bank-accounts",
      expect.not.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
      expect.anything(),
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    });

    const opts = useCaptureBankAccountsOptions({ cursor: "eyJpZCI6Mn0", limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/finance/bank-accounts",
      expect.objectContaining({ cursor: "eyJpZCI6Mn0" }),
      forwardedSignal,
      expect.anything(),
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { limit: 20, nextCursor: "xyz", hasMore: true },
    });

    const opts = useCaptureBankAccountsOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/finance/bank-accounts",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
      expect.anything(),
    );
  });
});

