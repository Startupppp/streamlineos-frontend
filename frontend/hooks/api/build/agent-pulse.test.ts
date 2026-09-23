import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAgentPulse } from "./agent-pulse";
import type { BuildScope } from "@/lib/build/build-scope";

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

const ORG_SCOPE: BuildScope = {
  type: "organization",
  managedProductId: null,
  projectId: null,
  basePath: "/build",
};

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
    const { result } = renderHook(() => useAgentPulse(ORG_SCOPE), {
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
    const { result } = renderHook(() => useAgentPulse(ORG_SCOPE), {
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
    const { result } = renderHook(() => useAgentPulse(ORG_SCOPE), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getApiGet()).not.toHaveBeenCalled();
  });

  it("two different scopes produce different cache entries — each scope fires its own independent fetch (BSN-03-040)", async () => {
    const orgSignal = { type: "overdue_approval", entityId: 1, projectId: 10, title: "Org approval", dueAt: null };
    const projectSignal = { type: "blocked_milestone", entityId: 2, projectId: 7, title: "Project milestone", dueAt: null };

    const projectScope: BuildScope = {
      type: "project",
      managedProductId: null,
      projectId: 7,
      basePath: "/build/7",
    };

    getApiGet().mockResolvedValue(orgSignal);
    const { result: orgResult } = renderHook(() => useAgentPulse(ORG_SCOPE), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(orgResult.current.isSuccess).toBe(true));
    expect(orgResult.current.data).toMatchObject({ type: "overdue_approval" });

    jest.resetAllMocks();
    const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };
    useCan.mockReturnValue(true);
    getApiGet().mockResolvedValue(projectSignal);
    const { result: projectResult } = renderHook(() => useAgentPulse(projectScope), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(projectResult.current.isSuccess).toBe(true));
    expect(projectResult.current.data).toMatchObject({ type: "blocked_milestone" });

    expect(orgResult.current.data).not.toMatchObject({ type: "blocked_milestone" });
  });
});
