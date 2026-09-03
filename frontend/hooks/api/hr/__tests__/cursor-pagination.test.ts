import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { useHrCases, useDisciplinaryActions } from "../cases";

const forwardedSignal = new AbortController().signal;

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
  keepPreviousData: undefined,
}));
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  usePermissionGate: jest.fn((permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  })),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({ getErrorMessage: jest.fn((e: unknown) => String(e)) }));

const mockQuery = useQuery as jest.Mock;
const mockCan = useCan as jest.Mock;

function useCaptureHrCasesOptions(params?: Parameters<typeof useHrCases>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useHrCases(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: (context: { signal?: AbortSignal }) => unknown };
}

function useCaptureDisciplinaryOptions(params?: Parameters<typeof useDisciplinaryActions>[0]) {
  mockQuery.mockImplementation((opts: unknown) => opts);
  useDisciplinaryActions(params);
  return mockQuery.mock.calls.at(-1)?.[0] as { queryFn: (context: { signal?: AbortSignal }) => unknown };
}

const cursorResponse = {
  data: [],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

describe("useHrCases — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = useCaptureHrCasesOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases",
      expect.not.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = useCaptureHrCasesOptions({ cursor: "eyJpZCI6MjB9", limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9" }),
      forwardedSignal,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue({ ...cursorResponse, pagination: { ...cursorResponse.pagination, hasMore: true, nextCursor: "abc" } });

    const opts = useCaptureHrCasesOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
    );
  });

  it("BITES: fails when cursor is absent but page 2 cursor is expected", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = useCaptureHrCasesOptions({ cursor: "eyJpZCI6MjB9", limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases",
      expect.objectContaining({ cursor: "eyJpZCI6MjB9" }),
      forwardedSignal,
    );
  });
});

describe("useDisciplinaryActions — cursor pagination contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("sends no cursor param on page 1", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = useCaptureDisciplinaryOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases/disciplinary",
      expect.not.objectContaining({ cursor: expect.anything() }),
      forwardedSignal,
    );
  });

  it("sends cursor on page 2", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = useCaptureDisciplinaryOptions({ cursor: "eyJpZCI6NX0", limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases/disciplinary",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
      forwardedSignal,
    );
  });

  it("never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = useCaptureDisciplinaryOptions({ limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases/disciplinary",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
    );
  });

  it("BITES: fails when cursor is absent but page 2 cursor is expected", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.get as jest.Mock).mockResolvedValue(cursorResponse);

    const opts = useCaptureDisciplinaryOptions({ cursor: "eyJpZCI6NX0", limit: 20 });
    void opts.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/cases/disciplinary",
      expect.objectContaining({ cursor: "eyJpZCI6NX0" }),
      forwardedSignal,
    );
  });
});
