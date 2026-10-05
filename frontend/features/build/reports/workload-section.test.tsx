import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import type { WorkloadCapacityCapacityResponse } from "@/contracts/build-contracts.generated";

const mockApiGet = jest.fn();
jest.mock("@/lib/api-client", () => ({
  ...jest.requireActual("@/lib/api-client"),
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { WorkloadSection } from "./workload-section";

function makeCapacity(overrides: Partial<WorkloadCapacityCapacityResponse["members"][number]> = {}) {
  return {
    userId: "user-1", membershipId: 1, teams: [], workingDaysInWindow: 20,
    leaveDays: 0, halfLeaveDays: 0, netCapacityDays: 20, capacityHours: 40,
    loggedHours: 0, estimateHours: 20, allocationPercent: 50, varianceHours: 20,
    isOverAllocated: false, isZeroCapacity: false, utilizationPercent: 50,
    ...overrides,
  };
}

function memberRow(id: string, name: string) {
  return { id, name, firstName: null, lastName: null, image: null,
    email: `${id}@example.com`, role: "MEMBER", joinedAt: "2026-10-05T00:00:00.000Z" };
}

function pendingRead<T>() {
  let resolve: (value: T) => void = () => { throw new Error("Read not initialized"); };
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

let accessScopes: Record<string, "all"> = { "build:view": "all", "build:tickets:view": "all" };
let access = { membershipId: 1, scopes: accessScopes, modules: { build: true }, isOrgOwner: false, version: 1 };
let membersRead = () => Promise.resolve({ data: [memberRow("user-1", "Alice")], nextCursor: null });
let capacityRead = () => Promise.resolve({ members: [makeCapacity()] });
let accessRead = () => Promise.resolve(access);
const clients: ReturnType<typeof createAppQueryClient>[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  accessScopes = { "build:view": "all", "build:tickets:view": "all" };
  access = { membershipId: 1, scopes: accessScopes, modules: { build: true }, isOrgOwner: false, version: 1 };
  accessRead = () => Promise.resolve(access);
  membersRead = () => Promise.resolve({ data: [memberRow("user-1", "Alice")], nextCursor: null });
  capacityRead = () => Promise.resolve({ members: [makeCapacity()] });
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/me/access") return accessRead();
    if (path.endsWith("/members")) return membersRead();
    if (path.endsWith("/workload/capacity")) return capacityRead();
    return Promise.reject(new Error(`Unexpected read: ${path}`));
  });
});

afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
});

function renderWorkload() {
  const client = createAppQueryClient("authenticated:reserved-workload:reserved-member");
  clients.push(client);
  client.setDefaultOptions({ ...client.getDefaultOptions(), queries: {
    ...client.getDefaultOptions().queries, retry: false, gcTime: 0,
  } });
  function route(projectId: number) {
    return <SessionProvider session={{ user: { id: "reserved-member", role: "MEMBER" },
      orgId: "reserved-workload", expires: "2099-01-01T00:00:00.000Z" }} refetchOnWindowFocus={false}>
      <QueryClientProvider client={client}><WorkloadSection projectId={projectId} /></QueryClientProvider>
    </SessionProvider>;
  }
  const view = render(route(1));
  return { ...view, client, changeProject: (projectId: number) => view.rerender(route(projectId)) };
}

describe("WorkloadSection — overload indicator", () => {
  it("shows the overloaded badge when a member has isOverAllocated=true", async () => {
    capacityRead = () => Promise.resolve({ members: [makeCapacity({ isOverAllocated: true, estimateHours: 50 })] });
    renderWorkload();
    expect(await screen.findByText("Overloaded")).toBeVisible();
    expect(screen.getByText("Alice")).toBeVisible();
    expect(screen.getByText("50h / 40h")).toBeVisible();
  });

  it("does not show the overloaded badge when a member is within capacity", async () => {
    renderWorkload();
    expect(await screen.findByText("20h / 40h")).toBeVisible();
    expect(screen.queryByText("Overloaded")).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeVisible();
  });

  it("renders no member rows when members list is empty", async () => {
    membersRead = () => Promise.resolve({ data: [], nextCursor: null });
    renderWorkload();
    expect(await screen.findByText("No members found")).toBeVisible();
  });

  it("keeps legitimate null metrics distinct from loading and failure", async () => {
    capacityRead = () => Promise.resolve({ members: [makeCapacity({ capacityHours: null, estimateHours: null })] });
    renderWorkload();
    expect(await screen.findByText("Alice")).toBeVisible();
    expect(screen.getByText("— / —")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});

describe("WorkloadSection — query and access states", () => {
  it.each(["members", "capacity"])("shows loading while %s is unresolved without false success rows", async (read) => {
    const members = pendingRead<Awaited<ReturnType<typeof membersRead>>>();
    const capacity = pendingRead<Awaited<ReturnType<typeof capacityRead>>>();
    if (read === "members") membersRead = () => members.promise;
    else capacityRead = () => capacity.promise;
    renderWorkload();
    const target = read === "members" ? "/build/1/members" : "/build/1/workload/capacity";
    await waitFor(() => expect(mockApiGet.mock.calls.some(([path]) => path === target)).toBe(true));
    expect(mockApiGet.mock.calls.find(([path]) => path === target)?.[2]).toBeInstanceOf(AbortSignal);
    expect(screen.getByRole("status", { name: "Loading..." })).toBeVisible();
    expect(screen.queryByText("No members found")).not.toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    await act(async () => {
      members.resolve({ data: [memberRow("user-1", "Alice")], nextCursor: null });
      capacity.resolve({ members: [makeCapacity()] });
    });
    expect(await screen.findByText("20h / 40h")).toBeVisible();
  });

  it.each(["members", "capacity"])("shows a %s error and retries the original query", async (read) => {
    const failure = new ApiError("Reserved workload read failed", 503, "BACKEND_UNREACHABLE");
    if (read === "members") membersRead = () => Promise.reject(failure);
    else capacityRead = () => Promise.reject(failure);
    renderWorkload();
    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(screen.queryByText("No members found")).not.toBeInTheDocument();
    membersRead = () => Promise.resolve({ data: [memberRow("user-1", "Alice")], nextCursor: null });
    capacityRead = () => Promise.resolve({ members: [makeCapacity()] });
    fireEvent.click(retry);
    expect(await screen.findByText("20h / 40h")).toBeVisible();
    const target = `/build/1/${read === "members" ? "members" : "workload/capacity"}`;
    expect(mockApiGet.mock.calls.filter(([path]) => path === target).length).toBeGreaterThan(1);
  });

  it.each([[402, "MODULE_NOT_ENABLED", "Module not enabled"], [403, "FORBIDDEN", "Access Restricted"], [404, "NOT_FOUND", "Not found"]])(
    "preserves capacity HTTP%s classification", async (status, code, title) => {
      const details = status === 402 ? { moduleKey: "build", reason: "org-disabled", upgradePath: null } : undefined;
      capacityRead = () => Promise.reject(new ApiError("Reserved denied read", Number(status), String(code), details));
      renderWorkload();
      expect(await screen.findByRole("heading", { name: String(title) })).toBeVisible();
      expect(screen.queryByText("No members found")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    },
  );

  it("renders access restriction when build:view is denied without unauthorized reads", async () => {
    access.scopes = {};
    renderWorkload();
    expect(await screen.findByRole("heading", { name: "Access Restricted" })).toBeVisible();
    expect(mockApiGet.mock.calls.every(([path]) => path === "/me/access")).toBe(true);
  });

  it("requires the capacity permission separately from the member permission", async () => {
    access.scopes = { "build:view": "all" };
    renderWorkload();
    expect(await screen.findByRole("heading", { name: "Access Restricted" })).toBeVisible();
    expect(mockApiGet.mock.calls.some(([path]) => path.endsWith("/workload/capacity"))).toBe(false);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("shows access loading without denial or premature project reads", async () => {
    const pending = pendingRead<typeof access>();
    accessRead = () => pending.promise;
    renderWorkload();
    expect(screen.getByRole("status", { name: "Loading..." })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Access Restricted" })).not.toBeInTheDocument();
    expect(mockApiGet.mock.calls.every(([path]) => path === "/me/access")).toBe(true);
    await act(async () => { pending.resolve(access); });
    expect(await screen.findByText("20h / 40h")).toBeVisible();
  });

  it("preserves established metrics during background refetch", async () => {
    const view = renderWorkload();
    expect(await screen.findByText("20h / 40h")).toBeVisible();
    const pending = pendingRead<Awaited<ReturnType<typeof capacityRead>>>();
    capacityRead = () => pending.promise;
    act(() => { void view.client.refetchQueries(); });
    expect(screen.getByText("20h / 40h")).toBeVisible();
    await act(async () => { pending.resolve({ members: [makeCapacity({ estimateHours: 30 })] }); });
    expect(await screen.findByText("30h / 40h")).toBeVisible();
  });

  it("does not display the previous project's rows during a new context read", async () => {
    const view = renderWorkload();
    expect(await screen.findByText("20h / 40h")).toBeVisible();
    const pending = pendingRead<Awaited<ReturnType<typeof membersRead>>>();
    membersRead = () => pending.promise;
    view.changeProject(2);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading..." })).toBeVisible();
    await act(async () => { pending.resolve({ data: [memberRow("user-2", "Bob")], nextCursor: null }); });
    expect(await screen.findByText("Bob")).toBeVisible();
  });
});
