import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { usePortfolios } from "./portfolios";
import { useManagedProducts } from "./managed-products";

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn((options: unknown) => options),
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
jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    projects: {
      portfolios: {
        list: (p?: unknown) => ["streamlineos", "projects", "portfolios", "list", p],
        detail: (id: number) => ["streamlineos", "projects", "portfolios", "detail", id],
      },
      managedProducts: {
        list: (p?: unknown) => ["streamlineos", "projects", "managedProducts", "list", p],
        detail: (id: number) => ["streamlineos", "projects", "managedProducts", "detail", id],
      },
    },
  },
}));

const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;

function useCapturePortfolioOptions(params?: Parameters<typeof usePortfolios>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  usePortfolios(params);
  return mockQuery.mock.calls.at(-1)?.[0] as {
    queryKey: unknown[];
    queryFn: (context: { signal?: AbortSignal }) => unknown;
  };
}

function useCaptureManagedProductsOptions(params?: Parameters<typeof useManagedProducts>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useManagedProducts(params);
  return mockQuery.mock.calls.at(-1)?.[0] as {
    queryKey: unknown[];
    queryFn: (context: { signal?: AbortSignal }) => unknown;
  };
}

describe("usePortfolios — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends no cursor param on page 1 (no cursor in params)", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } });

    const opts = useCapturePortfolioOptions({ limit: 20 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/portfolios",
      expect.not.objectContaining({ cursor: expect.anything() }),
      undefined,
      expect.any(Function),
    );
  });

  it("sends cursor on next page request", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } });

    const opts = useCapturePortfolioOptions({ cursor: "eyJpZCI6NDJ9", limit: 20 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/portfolios",
      expect.objectContaining({ cursor: "eyJpZCI6NDJ9" }),
      undefined,
      expect.any(Function),
    );
  });

  it("never sends a 'page' parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], pagination: { limit: 20, nextCursor: "abc", hasMore: true } });

    const opts = useCapturePortfolioOptions({ cursor: "abc", limit: 20 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/portfolios",
      expect.not.objectContaining({ page: expect.anything() }),
      undefined,
      expect.any(Function),
    );
  });
});

describe("useManagedProducts — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends no cursor param on page 1 (no cursor in params)", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } });

    const opts = useCaptureManagedProductsOptions({ limit: 20 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/managed-products",
      expect.not.objectContaining({ cursor: expect.anything() }),
      undefined,
      expect.any(Function),
    );
  });

  it("sends cursor on next page request", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], pagination: { limit: 20, nextCursor: null, hasMore: false } });

    const opts = useCaptureManagedProductsOptions({ cursor: "eyJpZCI6NX0", limit: 20 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/managed-products",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
      undefined,
      expect.any(Function),
    );
  });

  it("never sends a 'page' parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [], pagination: { limit: 20, nextCursor: "xyz", hasMore: true } });

    const opts = useCaptureManagedProductsOptions({ cursor: "xyz", limit: 20 });
    void opts.queryFn({});

    expect(apiClient.get).toHaveBeenCalledWith(
      "/build/managed-products",
      expect.not.objectContaining({ page: expect.anything() }),
      undefined,
      expect.any(Function),
    );
  });
});
