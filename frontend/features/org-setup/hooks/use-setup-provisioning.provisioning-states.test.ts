import { renderHook } from "@testing-library/react";
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

describe("useSetupProvisioning — not started", () => {
  it("returns safe defaults when isStarted is false", () => {
    const { result } = renderHook(() => useSetupProvisioning(false));
    expect(result.current.isReady).toBe(false);
    expect(result.current.background).toBe("unknown");
    expect(result.current.issue).toBeNull();
    expect(result.current.hasTimedOut).toBe(false);
    expect(result.current.isRechecking).toBe(false);
  });
});

describe("useSetupProvisioning — ready + pending", () => {
  it("isReady true, no blocking issue when ready:true + pending", () => {
    mockQueryResult = {
      data: buildStatus("pending", { ready: true }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.isReady).toBe(true);
    expect(result.current.issue).toBeNull();
    expect(result.current.background).toBe("pending");
  });

  it("isReady false when ready:false even with pending provisioning", () => {
    mockQueryResult = {
      data: buildStatus("pending", { ready: false }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.isReady).toBe(false);
    expect(result.current.issue).toBeNull();
  });
});

describe("useSetupProvisioning — RETRYING", () => {
  it("ANTI-VACUITY: DEAD returns background failed (not in-progress)", () => {
    mockQueryResult = {
      data: buildStatus("failed", { errorCode: "SETUP_BACKGROUND_DEAD", ready: true }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.background).toBe("failed");
  });

  it("RETRYING maps to in-progress background, not failed", () => {
    mockQueryResult = {
      data: buildStatus("failed", { errorCode: "SETUP_BACKGROUND_RETRYING", ready: true }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.background).toBe("in-progress");
    expect(result.current.issue).toBeNull();
    expect(result.current.isReady).toBe(true);
  });

  it("RETRYING does not produce a terminal issue message", () => {
    mockQueryResult = {
      data: buildStatus("failed", { errorCode: "SETUP_BACKGROUND_RETRYING", ready: true }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.issue).toBeNull();
  });
});

describe("useSetupProvisioning — DEAD", () => {
  it("DEAD: terminal background, canContinue true when ready, reference carries correlationId", () => {
    mockQueryResult = {
      data: buildStatus("failed", {
        errorCode: "SETUP_BACKGROUND_DEAD",
        ready: true,
        correlationId: "corr-dead-abc",
      }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.background).toBe("failed");
    expect(result.current.issue).not.toBeNull();
    expect(result.current.issue?.canContinue).toBe(true);
    expect(result.current.issue?.reference).toBe("corr-dead-abc");
  });

  it("DEAD: message does not promise background completion", () => {
    mockQueryResult = {
      data: buildStatus("failed", {
        errorCode: "SETUP_BACKGROUND_DEAD",
        ready: true,
        correlationId: null,
      }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.issue?.message).not.toMatch(/will finish on its own/i);
  });

  it("DEAD: canContinue false when ready is false", () => {
    mockQueryResult = {
      data: buildStatus("failed", {
        errorCode: "SETUP_BACKGROUND_DEAD",
        ready: false,
        correlationId: null,
      }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.issue?.canContinue).toBe(false);
  });
});

describe("useSetupProvisioning — INVALID and SUPPRESSED", () => {
  it("INVALID: terminal with distinct message from DEAD", () => {
    const deadResult = renderHook(() => {
      mockQueryResult = {
        data: buildStatus("failed", {
          errorCode: "SETUP_BACKGROUND_DEAD",
          ready: true,
          correlationId: null,
        }),
        error: null,
        isFetching: false,
        refetch: mockRefetch,
      };
      return useSetupProvisioning(true);
    });

    mockQueryResult = {
      data: buildStatus("failed", {
        errorCode: "SETUP_BACKGROUND_INVALID",
        ready: true,
        correlationId: "corr-inv",
      }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.background).toBe("failed");
    expect(result.current.issue).not.toBeNull();
    expect(result.current.issue?.title).not.toBe(deadResult.result.current.issue?.title);
    expect(result.current.issue?.reference).toBe("corr-inv");
    deadResult.unmount();
  });

  it("SUPPRESSED: terminal with distinct message from DEAD and INVALID", () => {
    mockQueryResult = {
      data: buildStatus("failed", {
        errorCode: "SETUP_BACKGROUND_SUPPRESSED",
        ready: true,
        correlationId: "corr-sup",
      }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result } = renderHook(() => useSetupProvisioning(true));
    expect(result.current.background).toBe("failed");
    expect(result.current.issue?.canContinue).toBe(true);
    expect(result.current.issue?.reference).toBe("corr-sup");
  });

  it("INVALID and SUPPRESSED titles differ from each other", () => {
    mockQueryResult = {
      data: buildStatus("failed", { errorCode: "SETUP_BACKGROUND_INVALID", ready: true, correlationId: null }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result: rInvalid } = renderHook(() => useSetupProvisioning(true));

    mockQueryResult = {
      data: buildStatus("failed", { errorCode: "SETUP_BACKGROUND_SUPPRESSED", ready: true, correlationId: null }),
      error: null,
      isFetching: false,
      refetch: mockRefetch,
    };
    const { result: rSuppressed } = renderHook(() => useSetupProvisioning(true));

    expect(rInvalid.current.issue?.title).not.toBe(rSuppressed.current.issue?.title);
  });
});
