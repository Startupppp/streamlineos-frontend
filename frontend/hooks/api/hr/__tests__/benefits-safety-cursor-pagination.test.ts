import { useQuery } from "@tanstack/react-query";
import { useBenefitPlans, useInsuranceClaims } from "../benefits";
import { useSafetyIncidents } from "../safety";

const forwardedSignal = new AbortController().signal;

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
  keepPreviousData: undefined,
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
  usePermissionGate: jest.fn((permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  })),
}));
jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    hr: {
      benefitPlans: (params: unknown) => ["hr", "benefit-plans", params],
      benefitClaims: (params: unknown) => ["hr", "benefit-claims", params],
    },
    hrSafety: {
      incidents: (params: unknown) => ["hr", "safety", params],
    },
  },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: jest.fn((error: unknown) => String(error)),
}));

type QueryOptions = { queryFn: (context: { signal?: AbortSignal }) => unknown };

function captureOptions(call: () => void): QueryOptions {
  call();
  return (useQuery as jest.Mock).mock.calls.at(-1)?.[0] as QueryOptions;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe.each([
  [
    "benefit plans",
    "/hr/benefits/plans",
    () => useBenefitPlans({ cursor: "plans-cursor", limit: 20 }),
    "plans-cursor",
  ],
  [
    "insurance claims",
    "/hr/benefits/claims",
    () => useInsuranceClaims({ cursor: "claims-cursor", limit: 20 }),
    "claims-cursor",
  ],
  [
    "safety incidents",
    "/hr/safety/incidents",
    () => useSafetyIncidents({ cursor: "safety-cursor", limit: 20 }),
    "safety-cursor",
  ],
] as const)("%s cursor contract", (_label, endpoint, invoke, cursor) => {
  it("forwards the opaque cursor and never sends a page parameter", () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    const options = captureOptions(invoke);
    void options.queryFn({ signal: forwardedSignal });

    expect(apiClient.get).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({ cursor }),
      forwardedSignal,
      expect.any(Function),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      endpoint,
      expect.not.objectContaining({ page: expect.anything() }),
      forwardedSignal,
      expect.any(Function),
    );
  });
});
