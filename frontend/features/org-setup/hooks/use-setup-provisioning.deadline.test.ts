import { renderHook, act } from "@testing-library/react";
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

describe("useSetupProvisioning — 90s deadline and recheck", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("hasTimedOut becomes true after 90s with no terminal data", () => {
    mockQueryResult = { data: undefined, error: null, isFetching: false, refetch: mockRefetch };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.hasTimedOut).toBe(false);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    expect(result.current.hasTimedOut).toBe(true);
  });

  it("does not time out before 90s", () => {
    mockQueryResult = { data: undefined, error: null, isFetching: false, refetch: mockRefetch };
    const { result } = renderHook(() => useSetupProvisioning(true));

    act(() => {
      jest.advanceTimersByTime(89_999);
    });

    expect(result.current.hasTimedOut).toBe(false);
  });

  it("recheck() resets hasTimedOut and restarts the 90s deadline", () => {
    mockQueryResult = { data: undefined, error: null, isFetching: false, refetch: mockRefetch };
    const { result } = renderHook(() => useSetupProvisioning(true));

    act(() => {
      jest.advanceTimersByTime(90_000);
    });
    expect(result.current.hasTimedOut).toBe(true);

    act(() => {
      result.current.recheck();
    });
    expect(result.current.hasTimedOut).toBe(false);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it("recheck() calls refetch", () => {
    mockQueryResult = { data: undefined, error: null, isFetching: false, refetch: mockRefetch };
    const { result } = renderHook(() => useSetupProvisioning(true));

    act(() => {
      result.current.recheck();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("deadline timer does not fire when isStarted is false", () => {
    mockQueryResult = { data: undefined, error: null, isFetching: false, refetch: mockRefetch };
    const { result } = renderHook(() => useSetupProvisioning(false));

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    expect(result.current.hasTimedOut).toBe(false);
  });
});

describe("useSetupProvisioning — optional enrichment failed but setup completed", () => {
  it("surfaces a continuable issue with the support reference on SETUP_BACKGROUND_PARTIAL", () => {
    mockQueryResult.data = buildStatus("completed", {
      ready: true,
      errorCode: "SETUP_BACKGROUND_PARTIAL",
      correlationId: "corr-partial",
    });
    const { result } = renderHook(() => useSetupProvisioning(true));

    expect(result.current.isReady).toBe(true);
    expect(result.current.background).toBe("completed");
    expect(result.current.issue).not.toBeNull();
    expect(result.current.issue?.canContinue).toBe(true);
    expect(result.current.issue?.reference).toBe("corr-partial");
    expect(result.current.issue?.message).not.toMatch(/finish on its own/i);
  });

  it("reports no issue when setup completed with nothing skipped", () => {
    mockQueryResult.data = buildStatus("completed", {
      ready: true,
      errorCode: null,
      correlationId: null,
    });
    const { result } = renderHook(() => useSetupProvisioning(true));

    expect(result.current.isReady).toBe(true);
    expect(result.current.background).toBe("completed");
    expect(result.current.issue).toBeNull();
  });
});
