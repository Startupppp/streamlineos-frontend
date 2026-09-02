import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  useApproveLeaveDedicated,
  useCancelLeave,
  useRejectLeaveDedicated,
} from "./leaves";

jest.mock("@/lib/api-client", () => ({
  apiClient: { put: jest.fn(), patch: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { version: 7 } })),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
  })),
}));

const mockedPut = apiClient.put as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;

const IDENTITY = ["org-1", "user-1", 7] as const;

function keysUnderTest() {
  return {
    context: queryKeys.hr.leaves(...IDENTITY),
    team: queryKeys.hr.leavesTeam(...IDENTITY),
    thisWeek: queryKeys.hr.leavesThisWeek(...IDENTITY),
    myRequests: queryKeys.hr.leavesMyRequests(...IDENTITY),
  };
}

function harness() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const invalidated: unknown[] = [];
  jest
    .spyOn(client, "invalidateQueries")
    .mockImplementation((filters?: { queryKey?: unknown }) => {
      invalidated.push(filters?.queryKey);
      return Promise.resolve();
    });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, invalidated, Wrapper };
}

function contains(invalidated: unknown[], key: readonly unknown[]): boolean {
  return invalidated.some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(key),
  );
}

describe("leave decision invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPut.mockResolvedValue({ success: true });
    mockedPatch.mockResolvedValue({ success: true });
  });

  it("refreshes the team calendar and this-week roster after an approval", async () => {
    const { invalidated, Wrapper } = harness();
    const { result } = renderHook(() => useApproveLeaveDedicated(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({ leaveId: 1 });
    });

    const keys = keysUnderTest();
    expect(contains(invalidated, keys.context)).toBe(true);
    expect(contains(invalidated, keys.team)).toBe(true);
    expect(contains(invalidated, keys.thisWeek)).toBe(true);
    expect(contains(invalidated, keys.myRequests)).toBe(true);
  });

  it("refreshes the this-week roster after a rejection, so a rejected leave stops showing the person away", async () => {
    const { invalidated, Wrapper } = harness();
    const { result } = renderHook(() => useRejectLeaveDedicated(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({ leaveId: 1, reason: "Not approved" });
    });

    const keys = keysUnderTest();
    expect(contains(invalidated, keys.team)).toBe(true);
    expect(contains(invalidated, keys.thisWeek)).toBe(true);
  });

  it("refreshes the team views after the requester cancels an approved leave", async () => {
    const { invalidated, Wrapper } = harness();
    const { result } = renderHook(() => useCancelLeave(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(1);
    });

    const keys = keysUnderTest();
    expect(contains(invalidated, keys.team)).toBe(true);
    expect(contains(invalidated, keys.thisWeek)).toBe(true);
  });

  it("uses the same key shape to read and to invalidate, so no invalidation is inert", () => {
    const keys = keysUnderTest();
    expect(contains([keys.context], queryKeys.hr.leaves(...IDENTITY))).toBe(true);
    expect(contains([keys.thisWeek], queryKeys.hr.leaves(...IDENTITY))).toBe(false);
  });
});
