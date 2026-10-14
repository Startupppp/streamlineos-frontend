import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalendarSearch } from "./calendar-search";

const get = jest.fn();
let session = { orgId: "org-1", user: { id: "user-1" } };
let canView = true;

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: session, status: "authenticated" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => canView,
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
  canView = true;
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
  expect(client.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual([
    "streamlineos", "calendar", "search", "org-2", "user-2", true, filters,
  ]);
});

it("hides cached search pages when Calendar read permission is revoked", async () => {
  session = { orgId: "org-1", user: { id: "user-1" } };
  canView = true;
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

  canView = false;
  rerender();

  expect(result.current.data).toBeUndefined();
  expect(get).toHaveBeenCalledTimes(1);
});
