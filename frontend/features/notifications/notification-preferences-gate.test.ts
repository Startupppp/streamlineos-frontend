import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import {
  useNotificationPreferences,
  useSuppressions,
} from "@/hooks/api/notifications-preferences";

const mockGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const mockUseSession = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
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

describe("notification preference hooks are platform core (no permission gate)", () => {
  beforeEach(() => {
    mockGet.mockResolvedValue([]);
    mockUseSession.mockReturnValue({
      data: { orgId: "org-test-prefs" },
      status: "authenticated",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("useNotificationPreferences fires for any authenticated member without a permission check", async () => {
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.fetchStatus).not.toBe("idle");
    });
    expect(mockGet).toHaveBeenCalledWith("/notification-preferences");
  });

  it("useSuppressions fires for any authenticated member without a permission check", async () => {
    const { result } = renderHook(() => useSuppressions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(result.current.fetchStatus).not.toBe("idle");
    });
    expect(mockGet).toHaveBeenCalledWith(
      "/notification-preferences/suppressions",
    );
  });

  describe("bite-prove: both hooks go idle when session has no orgId", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { orgId: undefined },
        status: "authenticated",
      });
    });

    it("useNotificationPreferences stays idle when orgId is absent", async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: makeWrapper(),
      });
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe("idle");
      });
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("useSuppressions stays idle when orgId is absent", async () => {
      const { result } = renderHook(() => useSuppressions(), {
        wrapper: makeWrapper(),
      });
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe("idle");
      });
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
