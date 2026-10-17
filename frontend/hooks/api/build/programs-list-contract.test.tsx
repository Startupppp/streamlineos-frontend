import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePermissionGate } from "@/hooks/api/access";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { apiClient } from "@/lib/api-client";
import { usePrograms, useProgram, useDeleteProgram } from "./programs";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn(),
  useAccess: jest.fn(() => ({ data: { isOrgOwner: true }, refetch: jest.fn() })),
}));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(usePermissionGate).mockReturnValue({ permission: "build:programs:view", allowed: true, denied: false, pending: false, unavailable: false });
  jest.mocked(apiClient.get).mockResolvedValue({
    data: [],
    pagination: { limit: 25, nextCursor: null, hasMore: false },
  });
});

it("wires every supported Programs list input to GET /build/programs", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  renderHook(
    () =>
      usePrograms({
        cursor: "next-page",
        limit: 25,
        q: "launch",
        ownerId: "user-2",
        health: "at_risk",
        status: "on_hold",
        portfolioId: 7,
        projectId: 9,
        sort: "name",
        order: "asc",
      }),
    { wrapper: createWrapper(client) },
  );

  await waitFor(() => expect(jest.mocked(apiClient.get)).toHaveBeenCalled());

  expect(jest.mocked(apiClient.get)).toHaveBeenCalledWith(
    "/build/programs",
    {
      cursor: "next-page",
      limit: "25",
      q: "launch",
      ownerId: "user-2",
      health: "at_risk",
      status: "on_hold",
      portfolioId: "7",
      projectId: "9",
      sort: "name",
      order: "asc",
    },
    expect.any(AbortSignal),
    expect.anything(),
  );

  client.clear();
});


describe("Program detail query recovery72", () => {
  it("invalidates deleted Program detail and all linked-project cursor variants", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const key = buildWorkQueryKeys.projects.programs.detail(42, { projectsCursor: "project-next" });
    client.setQueryData(key, { name: "Deleted program" });
    jest.mocked(apiClient.delete).mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useDeleteProgram(), { wrapper: createWrapper(client) });
    await result.current.mutateAsync(42);
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    unmount();
    client.clear();
  });
  const detail = {
    id: 42, orgId: "org-1", name: "Program launch", description: "Coordinated launch delivery",
    status: "on_hold", health: "at_risk", ownerId: null, portfolioId: null,
    createdBy: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", deletedAt: null,
    projects: { data: [{ id: 7, name: "Linked project", key: "SHIP", status: "ACTIVE", addedAt: "2026-10-01T00:00:00Z" }],
      pagination: { limit: 20, hasMore: false, nextCursor: null } },
  };
  it("uses canonical GET, cursor params, detail key, abort signal and detail contract", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    jest.mocked(apiClient.get).mockResolvedValue(detail);
    const { result, unmount } = renderHook(() => useProgram(42, { projectsCursor: "project-next", projectsLimit: 20 }),
      { wrapper: createWrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("/build/programs/42",
      { projectsCursor: "project-next", projectsLimit: "20" }, expect.any(AbortSignal), expect.any(Function));
    expect(usePermissionGate).toHaveBeenCalledWith("build:programs:view");
    expect(client.getQueryData(buildWorkQueryKeys.projects.programs.detail(42,
      { projectsCursor: "project-next", projectsLimit: "20" }))).toEqual(detail);
    const lazy = jest.mocked(apiClient.get).mock.calls[0][3];
    if (typeof lazy !== "function") throw new Error("Expected lazy canonical detail contract");
    const contract = await lazy();
    expect(contract.parse(detail)).toEqual(detail);
    expect(contract.safeParse({ ...detail, projects: [{ id: 7 }] }).success).toBe(false);
    const signal = jest.mocked(apiClient.get).mock.calls[0][2];
    expect(signal?.aborted).toBe(false);
    unmount();
    client.clear();
  });
  it("aborts the canonical detail request when its observer unmounts", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    jest.mocked(apiClient.get).mockImplementation(() => new Promise(() => {}));
    const { unmount } = renderHook(() => useProgram(42), { wrapper: createWrapper(client) });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const signal = jest.mocked(apiClient.get).mock.calls[0][2];
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    client.clear();
  });
  it.each(["denied", "pending", "unavailable"] as const)("does not issue GET when permission is %s", async state => {
    jest.mocked(usePermissionGate).mockReturnValue({ permission: "build:programs:view", allowed: false,
      denied: state === "denied", pending: state === "pending", unavailable: state === "unavailable" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useProgram(42), { wrapper: createWrapper(client) });
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });
  it.each([0, -1, 1.5, NaN])("does not issue GET for invalid program id %s", async programId => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useProgram(programId), { wrapper: createWrapper(client) });
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(apiClient.get).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });
});
