import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import {
  useNotificationProviders,
  useNotificationEventCatalog,
  useNotificationPolicies,
} from "@/hooks/api/notifications-admin";

const mockGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-test-gate" }, status: "authenticated" }),
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

/**
 * Bite-prove: if useCan gate is removed from any of these hooks (enabled becomes
 * unconditionally true), the hook will call apiClient.get and the test fails.
 */
describe("notification admin query hook permission gates", () => {
  beforeEach(() => {
    mockGet.mockClear();
  });

  it("useNotificationProviders stays idle and never fetches when useCan returns false", async () => {
    const { result } = renderHook(() => useNotificationProviders(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("useNotificationEventCatalog stays idle and never fetches when useCan returns false", async () => {
    const { result } = renderHook(() => useNotificationEventCatalog(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("useNotificationPolicies stays idle and never fetches when useCan returns false", async () => {
    const { result } = renderHook(() => useNotificationPolicies(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });
    expect(mockGet).not.toHaveBeenCalled();
  });
});
