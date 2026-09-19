import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAgentPulse } from "./agent-pulse";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (load: () => unknown) => load,
}));

jest.mock("@/hooks/api/build/agent-pulse-schema", () => ({
  agentPulseContract: null,
}));

function getApiGet(): jest.Mock {
  return (jest.requireMock("@/lib/api-client") as { apiClient: { get: jest.Mock } }).apiClient.get;
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useAgentPulse", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns null when the API reports no active signal", async () => {
    getApiGet().mockResolvedValue(null);
    const { result } = renderHook(() => useAgentPulse(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("returns the signal when the API returns one", async () => {
    const signal = {
      type: "overdue_approval",
      entityId: 1,
      projectId: 10,
      title: "Budget approval",
      dueAt: "2026-09-01T10:00:00.000Z",
    };
    getApiGet().mockResolvedValue(signal);
    const { result } = renderHook(() => useAgentPulse(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ type: "overdue_approval" });
  });

  it("stays disabled when the actor cannot view approvals", async () => {
    const { useCan } = jest.requireMock("@/hooks/api/access") as {
      useCan: jest.Mock;
    };
    useCan.mockReturnValue(false);
    const { result } = renderHook(() => useAgentPulse(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getApiGet()).not.toHaveBeenCalled();
  });
});
