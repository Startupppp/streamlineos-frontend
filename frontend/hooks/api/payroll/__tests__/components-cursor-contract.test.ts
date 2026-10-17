import { useQuery } from "@tanstack/react-query";
import { usePayrollComponents } from "../components";

const forwardedSignal = new AbortController().signal;

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  keepPreviousData: Symbol("keepPreviousData"),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

type QueryOptions = { queryFn: (context: { signal?: AbortSignal }) => unknown };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /payroll/components follows the backend's strict cursor query", () => {
  it("forwards cursor and limit and never sends page, which the strict query schema rejects with 400", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    usePayrollComponents({ cursor: "components-cursor", limit: 20, type: "EARNING", search: "basic" });
    const options = (useQuery as jest.Mock).mock.calls.at(-1)?.[0] as QueryOptions;
    void options.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/payroll/components",
      expect.objectContaining({ cursor: "components-cursor", limit: 20, type: "EARNING", search: "basic" }),
      forwardedSignal,
      expect.any(Function),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      "/payroll/components",
      expect.not.objectContaining({ page: expect.anything(), pageSize: expect.anything() }),
      forwardedSignal,
      expect.any(Function),
    );
  });
});
