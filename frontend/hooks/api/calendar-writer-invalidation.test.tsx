import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useDisconnectIntegration } from "./integrations";
import { useRemoveOrgMember } from "./organization";
import { useDeleteUser, useUpdateUserStatus } from "./users/account-mutations";
import { useBulkArchive, useBulkRestore, useBulkSuspend } from "./users/bulk-mutations";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  setAutoSignOutSuppressed: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: { scopes: {}, modules: {}, isOrgOwner: false },
    refetch: jest.fn(),
  })),
  useCan: () => true,
}));

const mockedPost = apiClient.post as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

const RANGE_START = "2027-03-01T00:00:00.000Z";
const RANGE_END = "2027-03-31T00:00:00.000Z";

const SOURCES_KEY = queryKeys.calendar.sources();
const EXTERNAL_EVENTS_KEY = queryKeys.calendar.externalEvents(RANGE_START, RANGE_END);
const ROSTER_KEY = queryKeys.calendar.orgMembers(100);
const SEARCH_KEY = queryKeys.calendar.memberSearch("jo", 25);
const EVENTS_KEY = queryKeys.calendar.events(RANGE_START, RANGE_END);

function createSeededClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  client.setQueryData(SOURCES_KEY, []);
  client.setQueryData(EXTERNAL_EVENTS_KEY, { events: [], warnings: [] });
  client.setQueryData(ROSTER_KEY, []);
  client.setQueryData(SEARCH_KEY, []);
  client.setQueryData(EVENTS_KEY, { events: [], warnings: [] });
  return client;
}

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function isInvalidated(client: QueryClient, key: readonly unknown[]): boolean {
  return client.getQueryState(key)?.isInvalidated === true;
}

describe("CA5 — connection disconnect busts the calendar source and external ranges", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDelete.mockResolvedValue({ deleted: true });
  });

  it("invalidates the source list and the parameterised external-event range", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useDisconnectIntegration(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync(7);
    });

    expect(isInvalidated(client, SOURCES_KEY)).toBe(true);
    expect(isInvalidated(client, EXTERNAL_EVENTS_KEY)).toBe(true);
  });
});

describe("CA5 — membership writers bust the calendar member pickers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ success: true, succeeded: 1, failed: 0 });
    mockedPatch.mockResolvedValue({ success: true });
    mockedDelete.mockResolvedValue({ success: true });
  });

  it("removing an org member invalidates both member-lookup prefixes", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useRemoveOrgMember(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync("user-1");
    });

    expect(isInvalidated(client, ROSTER_KEY)).toBe(true);
    expect(isInvalidated(client, SEARCH_KEY)).toBe(true);
  });

  it("suspending a user invalidates both member-lookup prefixes", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useUpdateUserStatus(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ userId: "user-1", status: "suspended" });
    });

    expect(isInvalidated(client, ROSTER_KEY)).toBe(true);
    expect(isInvalidated(client, SEARCH_KEY)).toBe(true);
  });

  it("reactivating a user invalidates both member-lookup prefixes", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useUpdateUserStatus(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ userId: "user-1", status: "active" });
    });

    expect(isInvalidated(client, ROSTER_KEY)).toBe(true);
    expect(isInvalidated(client, SEARCH_KEY)).toBe(true);
  });

  it("deleting a user invalidates both member-lookup prefixes", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync("user-1");
    });

    expect(isInvalidated(client, ROSTER_KEY)).toBe(true);
    expect(isInvalidated(client, SEARCH_KEY)).toBe(true);
  });

  it("bulk suspend invalidates both member-lookup prefixes", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useBulkSuspend(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ userIds: ["user-1", "user-2"] });
    });

    expect(isInvalidated(client, ROSTER_KEY)).toBe(true);
    expect(isInvalidated(client, SEARCH_KEY)).toBe(true);
  });

  it("bulk archive invalidates both member-lookup prefixes", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useBulkArchive(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ userIds: ["user-1"] });
    });

    expect(isInvalidated(client, ROSTER_KEY)).toBe(true);
    expect(isInvalidated(client, SEARCH_KEY)).toBe(true);
  });

  it("bulk restore invalidates both member-lookup prefixes", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useBulkRestore(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ userIds: ["user-1"] });
    });

    expect(isInvalidated(client, ROSTER_KEY)).toBe(true);
    expect(isInvalidated(client, SEARCH_KEY)).toBe(true);
  });

  it("does not widen the member-lookup bust onto calendar event ranges", async () => {
    const client = createSeededClient();
    const { result } = renderHook(() => useRemoveOrgMember(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync("user-1");
    });

    expect(isInvalidated(client, EVENTS_KEY)).toBe(false);
  });
});
