import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalendarSearch } from "./calendar-search";

const get = jest.fn();
let session = { orgId: "org-1", user: { id: "user-1" } };
let accessSnapshot: {
  isOrgOwner: boolean;
  scopes: Record<string, string>;
  membershipId: number;
  version: number;
} = {
  isOrgOwner: false,
  scopes: { "calendar:read": "all" },
  membershipId: 7,
  version: 1,
};

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: session, status: "authenticated" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: accessSnapshot }),
  useCan: (key: string) => Boolean(accessSnapshot.scopes[key]),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const filters = { start: "2026-10-14T00:00:00.000Z", end: "2026-10-15T00:00:00.000Z" };

it("does not reuse search pages across user or organization changes", async () => {
  session = { orgId: "org-1", user: { id: "user-1" } };
  accessSnapshot = { isOrgOwner: false, scopes: { "calendar:read": "all" }, membershipId: 7, version: 1 };
  get.mockReset().mockImplementation(async () => ({
    events: [{ id: `${session.orgId}:${session.user.id}` }],
    failures: [],
    truncated: false,
    coverageState: "complete",
    coverage: [],
    nextCursor: null,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result, rerender } = renderHook(() => useCalendarSearch(filters), { wrapper: wrapper(client) });

  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("org-1:user-1"));
  session = { orgId: "org-1", user: { id: "user-2" } };
  rerender();
  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("org-1:user-2"));
  session = { orgId: "org-2", user: { id: "user-2" } };
  rerender();
  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("org-2:user-2"));

  expect(get).toHaveBeenCalledTimes(3);
  expect(get).toHaveBeenCalledWith(
    "/calendar/search",
    expect.objectContaining({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    expect.anything(),
    expect.anything(),
  );
  expect(client.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual([
    "streamlineos", "calendar", "search", "org-2", "user-2", 7, 1, "all", true,
    { ...filters, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  ]);
});

it("hides cached search pages when Calendar read permission is revoked", async () => {
  session = { orgId: "org-1", user: { id: "user-1" } };
  accessSnapshot = { isOrgOwner: false, scopes: { "calendar:read": "all" }, membershipId: 7, version: 1 };
  get.mockReset().mockResolvedValue({
    events: [{ id: "private-event" }],
    failures: [],
    truncated: false,
    coverageState: "complete",
    coverage: [],
    nextCursor: null,
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result, rerender } = renderHook(() => useCalendarSearch(filters), { wrapper: wrapper(client) });
  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("private-event"));

  accessSnapshot = { isOrgOwner: false, scopes: {}, membershipId: 7, version: 2 };
  rerender();

  expect(result.current.data).toBeUndefined();
  expect(get).toHaveBeenCalledTimes(1);
});

it("does not reuse search pages after an access version or membership change", async () => {
  session = { orgId: "org-1", user: { id: "user-1" } };
  accessSnapshot = { isOrgOwner: false, scopes: { "calendar:read": "all" }, membershipId: 7, version: 1 };
  get.mockReset().mockImplementation(async () => ({
    events: [{ id: `${accessSnapshot.membershipId}:${accessSnapshot.version}` }],
    failures: [],
    truncated: false,
    coverageState: "complete",
    coverage: [],
    nextCursor: null,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result, rerender } = renderHook(() => useCalendarSearch(filters), { wrapper: wrapper(client) });

  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("7:1"));
  accessSnapshot = { ...accessSnapshot, version: 2 };
  rerender();
  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("7:2"));
  accessSnapshot = { ...accessSnapshot, membershipId: 8 };
  rerender();
  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("8:2"));

  expect(get).toHaveBeenCalledTimes(3);
});

it("does not reuse search pages when the Calendar read scope narrows without a version change", async () => {
  session = { orgId: "org-1", user: { id: "user-1" } };
  accessSnapshot = { isOrgOwner: false, scopes: { "calendar:read": "all" }, membershipId: 7, version: 1 };
  get.mockReset().mockImplementation(async () => ({
    events: [{ id: accessSnapshot.scopes["calendar:read"] }],
    failures: [],
    truncated: false,
    coverageState: "complete",
    coverage: [],
    nextCursor: null,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result, rerender } = renderHook(() => useCalendarSearch(filters), { wrapper: wrapper(client) });

  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("all"));
  accessSnapshot = { ...accessSnapshot, scopes: { "calendar:read": "own" } };
  rerender();
  await waitFor(() => expect(result.current.data?.pages[0]?.events[0]?.id).toBe("own"));

  expect(get).toHaveBeenCalledTimes(2);
});
