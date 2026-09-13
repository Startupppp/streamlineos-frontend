import { renderHook, act } from "@testing-library/react";
import { ApiError, CONTRACT_VIOLATION_CODE } from "@/lib/api-envelope";
import type { OrgSetupStatus } from "@/lib/api/hooks/org-schema";
import { useSetupProvisioning } from "./use-setup-provisioning";

type MockQueryResult = {
  data: OrgSetupStatus | undefined;
  error: Error | null;
  isFetching: boolean;
  refetch: jest.Mock;
};

let mockQueryResult: MockQueryResult;
let capturedEnabled: boolean | undefined;
const mockRefetch = jest.fn();

jest.mock("@/lib/api/hooks/org", () => ({
  useOrgSetupStatusQuery: jest.fn((opts: { enabled?: boolean } | undefined) => {
    capturedEnabled = opts?.enabled;
    return mockQueryResult;
  }),
}));

function buildStatus(
  provisioning: OrgSetupStatus["provisioning"],
  overrides: Partial<OrgSetupStatus> = {},
): OrgSetupStatus {
  return {
    orgId: "org-test",
    onboardingCompletedAt: null,
    ready: true,
    provisioning,
    errorCode: null,
    correlationId: null,
    recipientOutcomes: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockRefetch.mockReset();
  capturedEnabled = undefined;
  mockQueryResult = {
    data: undefined,
    error: null,
    isFetching: false,
    refetch: mockRefetch,
  };
});

describe("useSetupProvisioning — auth errors", () => {
  it("ANTI-VACUITY: a plain Error does not set auth terminal state", () => {
    mockQueryResult = {
      data: undefined,
      error: new Error("Network request failed"),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.issue?.title).not.toMatch(/session verification/i);
  });

  it("401: polling stops (enabled=false), distinct auth message", () => {
    mockQueryResult = {
      data: undefined,
      error: new ApiError("Unauthorized", 401),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(capturedEnabled).toBe(false);
    expect(result.current.issue).not.toBeNull();
    expect(result.current.issue?.message).toMatch(/session/i);
    expect(result.current.background).toBe("failed");
  });

  it("403: polling stops (enabled=false), distinct auth message", () => {
    mockQueryResult = {
      data: undefined,
      error: new ApiError("Forbidden", 403),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(capturedEnabled).toBe(false);
    expect(result.current.issue).not.toBeNull();
    expect(result.current.issue?.message).toMatch(/session/i);
  });

  it("401 and 403 produce the same auth issue (same message copy)", () => {
    mockQueryResult = {
      data: undefined,
      error: new ApiError("Unauthorized", 401),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result: r401 } = renderHook(() => useSetupProvisioning(true));

    mockQueryResult = {
      data: undefined,
      error: new ApiError("Forbidden", 403),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result: r403 } = renderHook(() => useSetupProvisioning(true));

    expect(r401.current.issue?.title).toBe(r403.current.issue?.title);
  });
});

describe("useSetupProvisioning — network failure", () => {
  it("non-auth network error shows honest connection message, recheck available", () => {
    mockQueryResult = {
      data: undefined,
      error: new Error("Network request failed"),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.issue).not.toBeNull();
    expect(result.current.issue?.message).toMatch(/connection/i);
    expect(typeof result.current.recheck).toBe("function");
  });
});

describe("useSetupProvisioning — contract violation", () => {
  it("ANTI-VACUITY: a non-contract ApiError does not set contract terminal state", () => {
    mockQueryResult = {
      data: undefined,
      error: new ApiError("Server error", 500),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.issue?.title).not.toMatch(/unexpected server response/i);
  });

  it("CONTRACT_VIOLATION: terminal, distinct message, nothing rendered as success", () => {
    mockQueryResult = {
      data: undefined,
      error: new ApiError("Contract violation", 200, CONTRACT_VIOLATION_CODE),
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(capturedEnabled).toBe(false);
    expect(result.current.issue).not.toBeNull();
    expect(result.current.issue?.title).toMatch(/unexpected server response/i);
    expect(result.current.isReady).toBe(false);
  });
});

describe("useSetupProvisioning — polling stops", () => {
  it("completed provisioning: background=completed, no issue", () => {
    mockQueryResult = {
      data: buildStatus("completed", { ready: true }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.background).toBe("completed");
    expect(result.current.issue).toBeNull();
    expect(result.current.isReady).toBe(true);
  });

  it("unmount produces no errors (cleanup runs cleanly)", () => {
    mockQueryResult = { data: undefined, error: null, isFetching: false, refetch: mockRefetch };
    const { unmount } = renderHook(() => useSetupProvisioning(true));
    expect(() => unmount()).not.toThrow();
  });
});

describe("useSetupProvisioning — orgId change stops polling", () => {
  it("hasTimedOut becomes true when orgId changes after being established", () => {
    mockQueryResult = {
      data: buildStatus("pending", { orgId: "org-first", ready: false }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result, rerender } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.hasTimedOut).toBe(false);

    mockQueryResult = {
      data: buildStatus("pending", { orgId: "org-second", ready: false }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    act(() => {
      rerender();
    });

    expect(result.current.hasTimedOut).toBe(true);
  });

  it("same orgId does not trigger hasTimedOut", () => {
    mockQueryResult = {
      data: buildStatus("pending", { orgId: "org-same", ready: false }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result, rerender } = renderHook(() => useSetupProvisioning(true));
    act(() => { rerender(); });
    expect(result.current.hasTimedOut).toBe(false);
  });
});
