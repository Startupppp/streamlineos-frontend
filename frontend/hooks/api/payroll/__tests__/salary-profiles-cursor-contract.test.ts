import { useQuery } from "@tanstack/react-query";
import { useEmployeeProfiles } from "../employees";

const forwardedSignal = new AbortController().signal;

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
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

describe("GET /payroll/employees follows the backend's strict cursor query", () => {
  it("forwards cursor and limit and never sends a page parameter, which the strict query schema rejects with 400", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    useEmployeeProfiles({ cursor: "profiles-cursor", limit: 20, status: "ACTIVE" });
    const options = (useQuery as jest.Mock).mock.calls.at(-1)?.[0] as QueryOptions;
    void options.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/payroll/employees",
      expect.objectContaining({ cursor: "profiles-cursor", limit: 20, status: "ACTIVE" }),
      forwardedSignal,
      expect.any(Function),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      "/payroll/employees",
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
      expect.any(Function),
    );
  });
});
