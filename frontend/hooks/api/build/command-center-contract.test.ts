import { allWorkPageContract } from "@/hooks/api/build/build-tickets-subresource-schema";
import {
  COMMAND_CENTER_MY_ISSUES_FILTERS,
  COMMAND_CENTER_MY_ISSUES_PAGE_SIZE,
} from "@/hooks/api/build/all-work";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api-client";
import { resolveContract, type ContractSource } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { useLandingPreference, useSetLandingPreference } from "./nav-preferences";
import { useDashboardLayout, useSaveDashboardLayout } from "./dashboard-layout";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
  isApiError: jest.requireActual<typeof import("@/lib/api-envelope")>("@/lib/api-envelope").isApiError,
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {} }, refetch: jest.fn() }),
}));

let mockResponse: unknown;

async function decodeBoundary<T>(
  path: string,
  body?: unknown,
  signal?: unknown,
  contract?: ContractSource<T>,
): Promise<T> {
  void path;
  void body;
  void signal;
  const resolved = await resolveContract(contract);
  if (!resolved) throw new Error("Response contract missing");
  return resolved.parse(mockResponse);
}

function hookClient() {
  const client = createAppQueryClient("authenticated:org-contract:user-contract");
  client.setDefaultOptions({ queries: { retry: false, throwOnError: false }, mutations: { retry: false } });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  }
  return { client, wrapper: Wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useCan).mockReturnValue(true);
  jest.mocked(apiClient.get).mockImplementation(decodeBoundary);
  jest.mocked(apiClient.put).mockImplementation(decodeBoundary);
});

const minimalTicket = {
  id: 1,
  title: "Overdue task",
  type: "TASK",
  status: "IN_PROGRESS",
  priority: "HIGH",
  projectId: 10,
  projectKey: "BLD",
  projectName: "Build",
  ticketNumber: 1,
  dueDate: "2026-09-25T00:00:00.000Z",
  startDate: null,
  points: null,
  estimate: null,
  rank: "a0",
  version: 1,
  cycleId: null,
  epicId: null,
  assigneeId: null,
  assignee: null,
  labels: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("COMMAND_CENTER_MY_ISSUES_FILTERS — stat query shape", () => {
  it("scopes to the current user so the My Issues panel shows only the viewer's own open work", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.scope).toBe("mine");
  });

  it("orders by dueDate ascending so the nearest-due items appear first in the panel", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.orderBy).toBe("dueDate");
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.orderDir).toBe("asc");
  });

  it("excludes DONE and CANCELLED so the count stat never inflates with completed work", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.excludeStatus).toBe("DONE,CANCELLED");
  });

  it("uses the page-size constant so the query and the filter agree on the batch size", () => {
    expect(COMMAND_CENTER_MY_ISSUES_FILTERS.limit).toBe(COMMAND_CENTER_MY_ISSUES_PAGE_SIZE);
  });
});

describe("allWorkPageContract — command-center data use cases", () => {
  it("parses a non-empty page so the My Issues panel has data to render", () => {
    const page = { data: [minimalTicket], limit: 15, nextCursor: null, hasMore: false };
    const parsed = allWorkPageContract.parse(page);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0]?.title).toBe("Overdue task");
  });

  it("parses an empty page with hasMore false so the panel renders the empty state instead of looping", () => {
    const page = { data: [], limit: 15, nextCursor: null, hasMore: false };
    const parsed = allWorkPageContract.parse(page);
    expect(parsed.data).toHaveLength(0);
    expect(parsed.hasMore).toBe(false);
  });

  it("parses a full first page with a string nextCursor so infinite scroll can continue from the command center panel", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({ ...minimalTicket, id: i + 1, ticketNumber: i + 1 }));
    const page = { data: rows, limit: 15, nextCursor: "cursor-abc", hasMore: true };
    const parsed = allWorkPageContract.parse(page);
    expect(parsed.nextCursor).toBe("cursor-abc");
    expect(parsed.hasMore).toBe(true);
  });
});

describe("buildWorkQueryKeys — command-center cache key isolation", () => {
  it("the my-issues key is distinct from the bare allWork key so clearing the command-center panel does not flush every all-work screen", () => {
    const myIssuesKey = buildWorkQueryKeys.projects.allWork(COMMAND_CENTER_MY_ISSUES_FILTERS);
    const bareKey = buildWorkQueryKeys.projects.allWork();
    expect(myIssuesKey).not.toEqual(bareKey);
  });

  it("the infinite scroll key has 'infinite' appended so useInfiniteAllWork and useAllWork occupy separate cache slots for the same filter set", () => {
    const finiteKey = buildWorkQueryKeys.projects.allWork(COMMAND_CENTER_MY_ISSUES_FILTERS);
    const infiniteKey = buildWorkQueryKeys.projects.allWorkInfinite(COMMAND_CENTER_MY_ISSUES_FILTERS);
    const infiniteStr = JSON.stringify(infiniteKey);
    expect(infiniteStr).toContain("infinite");
    expect(infiniteKey).not.toEqual(finiteKey);
  });

  it("two different filter objects with different scope values produce different keys so a scope=all stat does not pollute scope=mine cache entries", () => {
    const mineKey = buildWorkQueryKeys.projects.allWork({ scope: "mine" });
    const allKey = buildWorkQueryKeys.projects.allWork({ scope: "all" });
    expect(mineKey).not.toEqual(allKey);
  });
});

describe("dashboard and landing public hook contracts", () => {
  it("loads the landing destination through the canonical decoder and forwards an AbortSignal", async () => {
    mockResponse = { destination: "/build/my-work" };
    const harness = hookClient();
    const { result } = renderHook(useLandingPreference, { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toEqual({ destination: "/build/my-work" });
    expect(apiClient.get).toHaveBeenCalledWith("/build/landing-preference", undefined, expect.any(AbortSignal), expect.anything());
    harness.client.clear();
  });
  it("refuses an unknown dashboard widget from the server before editor hydration", async () => {
    mockResponse = { layoutVersion: 1, config: { widgets: [{ type: "unknown-widget", position: { col: 0, row: 0, w: 2, h: 2 } }] }, updatedAt: "2026-10-04T10:00:00Z" };
    const harness = hookClient();
    const { result } = renderHook(useDashboardLayout, { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
    harness.client.clear();
  });
  it("loads known dashboard widgets with their canonical position and AbortSignal", async () => {
    mockResponse = { layoutVersion: 2, config: { widgets: [{ type: "my-issues", position: { col: 0, row: 0, w: 3, h: 4 } }] }, updatedAt: "2026-10-04T10:00:00Z" };
    const harness = hookClient();
    const { result } = renderHook(useDashboardLayout, { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.config.widgets[0]?.type).toBe("my-issues");
    expect(result.current.data?.config.widgets[0]?.position).toEqual({ col: 0, row: 0, w: 3, h: 4 });
    expect(apiClient.get).toHaveBeenCalledWith("/build/command-center/layout", {}, expect.any(AbortSignal), expect.anything());
    harness.client.clear();
  });
  it("decodes and caches the acknowledged landing destination", async () => {
    mockResponse = { destination: "/build/command-center" };
    const harness = hookClient();
    const { result } = renderHook(useSetLandingPreference, { wrapper: harness.wrapper });
    await act(async () => { await result.current.mutateAsync("/build/command-center"); });
    expect(apiClient.put).toHaveBeenCalledWith("/build/landing-preference", { destination: "/build/command-center" }, undefined, expect.anything());
    expect(harness.client.getQueryData(buildWorkQueryKeys.landingPreference.mine())).toEqual({ destination: "/build/command-center" });
    expect(useCan).toHaveBeenCalledWith("build:view");
    harness.client.clear();
  });
  it("refuses a malformed landing acknowledgment without overwriting prior preference", async () => {
    mockResponse = { destination: 42 };
    const harness = hookClient();
    harness.client.setQueryData(buildWorkQueryKeys.landingPreference.mine(), { destination: "/build/my-work" });
    const { result } = renderHook(useSetLandingPreference, { wrapper: harness.wrapper });
    await act(async () => { await expect(result.current.mutateAsync("/build/command-center")).rejects.toThrow(); });
    expect(harness.client.getQueryData(buildWorkQueryKeys.landingPreference.mine())).toEqual({ destination: "/build/my-work" });
    harness.client.clear();
  });
  it("refuses landing writes without the endpoint permission and issues no PUT", async () => {
    jest.mocked(useCan).mockReturnValue(false);
    const harness = hookClient();
    const { result } = renderHook(useSetLandingPreference, { wrapper: harness.wrapper });
    await act(async () => { await expect(result.current.mutateAsync("/build/my-work")).rejects.toThrow("Missing permission: build:view"); });
    expect(apiClient.put).not.toHaveBeenCalled();
    harness.client.clear();
  });
  it("saves against the cached dashboard version and caches its decoded acknowledgment", async () => {
    mockResponse = { layoutVersion: 4, config: { widgets: [] }, updatedAt: "2026-10-04T10:00:00Z" };
    const harness = hookClient();
    harness.client.setQueryData(buildWorkQueryKeys.commandCenter.layout(), { layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" });
    const { result } = renderHook(useSaveDashboardLayout, { wrapper: harness.wrapper });
    await act(async () => { await result.current.mutateAsync({ widgets: [] }); });
    expect(apiClient.put).toHaveBeenCalledWith("/build/command-center/layout", { layoutVersion: 3, config: { widgets: [] } }, undefined, expect.anything());
    expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual({ layoutVersion: 4, config: { widgets: [] }, updatedAt: "2026-10-04T10:00:00Z" });
    expect(useCan).toHaveBeenCalledWith("build:dashboard:manage");
    harness.client.clear();
  });
  it("refuses malformed dashboard acknowledgment without overwriting a saved layout", async () => {
    mockResponse = { layoutVersion: 4, config: { widgets: [] }, updatedAt: 42 };
    const harness = hookClient();
    harness.client.setQueryData(buildWorkQueryKeys.commandCenter.layout(), { layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" });
    const { result } = renderHook(useSaveDashboardLayout, { wrapper: harness.wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ widgets: [] })).rejects.toThrow(); });
    expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual({ layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" });
    harness.client.clear();
  });
  it("refuses dashboard writes without manage permission and issues no PUT", async () => {
    jest.mocked(useCan).mockImplementation((permission) => permission !== "build:dashboard:manage");
    const harness = hookClient();
    const { result } = renderHook(useSaveDashboardLayout, { wrapper: harness.wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ widgets: [] })).rejects.toThrow("Missing permission: build:dashboard:manage"); });
    expect(apiClient.put).not.toHaveBeenCalled();
    harness.client.clear();
  });
  it("keeps the previous layout after transport failure and accepts a useful retry", async () => {
    mockResponse = { layoutVersion: 4, config: { widgets: [] }, updatedAt: "2026-10-04T10:00:00Z" };
    jest.mocked(apiClient.put).mockRejectedValueOnce(new Error("Network unavailable"));
    const harness = hookClient();
    harness.client.setQueryData(buildWorkQueryKeys.commandCenter.layout(), { layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" });
    const { result } = renderHook(useSaveDashboardLayout, { wrapper: harness.wrapper });
    await act(async () => { await expect(result.current.mutateAsync({ widgets: [] })).rejects.toThrow("Network unavailable"); });
    expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual({ layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" });
    await act(async () => { await result.current.mutateAsync({ widgets: [] }); });
    expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual({ layoutVersion: 4, config: { widgets: [] }, updatedAt: "2026-10-04T10:00:00Z" });
    harness.client.clear();
  });
  it("shows the new arrangement before the save resolves and restores the previous one when it fails", async () => {
    const moved = { widgets: [{ type: "projects" as const, position: { col: 0, row: 0, w: 6, h: 5 } }] };
    let rejectSave: (error: Error) => void = () => undefined;
    jest.mocked(apiClient.put).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    const harness = hookClient();
    const previous = { layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" };
    harness.client.setQueryData(buildWorkQueryKeys.commandCenter.layout(), previous);
    const { result } = renderHook(useSaveDashboardLayout, { wrapper: harness.wrapper });
    act(() => { result.current.mutate(moved); });
    await waitFor(() => expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual({ ...previous, config: moved }));
    await act(async () => { rejectSave(new Error("Network unavailable")); });
    await waitFor(() => expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual(previous));
    harness.client.clear();
  });
  it("restores the last saved layout, not an unsaved intermediate one, when back-to-back saves both fail", async () => {
    const harness = hookClient();
    const saved = { layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" };
    harness.client.setQueryData(buildWorkQueryKeys.commandCenter.layout(), saved);
    const first = { widgets: [{ type: "projects" as const, position: { col: 0, row: 0, w: 6, h: 5 } }] };
    const second = { widgets: [{ type: "projects" as const, position: { col: 6, row: 0, w: 6, h: 5 } }] };
    jest.mocked(apiClient.put).mockRejectedValueOnce(new Error("Network unavailable")).mockRejectedValueOnce(new Error("Network unavailable"));
    const { result } = renderHook(useSaveDashboardLayout, { wrapper: harness.wrapper });
    await act(async () => {
      await Promise.allSettled([result.current.mutateAsync(first), result.current.mutateAsync(second)]);
    });
    expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual(saved);
    harness.client.clear();
  });
  it("sends each queued save with the version the previous save returned so back-to-back edits never conflict", async () => {
    const harness = hookClient();
    harness.client.setQueryData(buildWorkQueryKeys.commandCenter.layout(), { layoutVersion: 3, config: { widgets: [] }, updatedAt: "2026-10-03T10:00:00Z" });
    const first = { widgets: [{ type: "projects" as const, position: { col: 0, row: 0, w: 6, h: 5 } }] };
    const second = { widgets: [{ type: "projects" as const, position: { col: 6, row: 0, w: 6, h: 5 } }] };
    jest.mocked(apiClient.put)
      .mockResolvedValueOnce({ layoutVersion: 4, config: first, updatedAt: "2026-10-04T10:00:00Z" })
      .mockResolvedValueOnce({ layoutVersion: 5, config: second, updatedAt: "2026-10-04T10:00:01Z" });
    const { result } = renderHook(useSaveDashboardLayout, { wrapper: harness.wrapper });
    await act(async () => { await Promise.all([result.current.mutateAsync(first), result.current.mutateAsync(second)]); });
    expect(apiClient.put).toHaveBeenNthCalledWith(1, "/build/command-center/layout", { layoutVersion: 3, config: first }, undefined, expect.anything());
    expect(apiClient.put).toHaveBeenNthCalledWith(2, "/build/command-center/layout", { layoutVersion: 4, config: second }, undefined, expect.anything());
    expect(harness.client.getQueryData(buildWorkQueryKeys.commandCenter.layout())).toEqual({ layoutVersion: 5, config: second, updatedAt: "2026-10-04T10:00:01Z" });
    harness.client.clear();
  });
});
