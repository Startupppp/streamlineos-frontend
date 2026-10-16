import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { calendarResourceListContract } from "./calendar-capacity-schema";
import { useCalendarResources } from "./calendar-capacity";

const get = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

it("parses resource pages and fetches the next cursor for Capacity", async () => {
  const first = { id: 1, kind: "room", ownership: "calendar", name: "First room", location: null, capacity: 1, divisible: false, requiresApproval: false, status: "active", version: 1 };
  const second = { ...first, id: 2, name: "Second room" };
  const firstPage = calendarResourceListContract.parse({ items: [first], nextCursor: "1" });
  const secondPage = calendarResourceListContract.parse({ items: [second], nextCursor: null });
  get.mockReset().mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { result } = renderHook(() => useCalendarResources(), { wrapper: wrapper(client) });
  await waitFor(() => expect(result.current.data?.pages[0]?.items[0]?.name).toBe("First room"));
  expect(result.current.hasNextPage).toBe(true);
  expect(get).toHaveBeenNthCalledWith(1, "/calendar/resources", { limit: 50 }, expect.anything(), expect.anything());

  await act(async () => {
    await result.current.fetchNextPage();
  });

  expect(get).toHaveBeenNthCalledWith(2, "/calendar/resources", { limit: 50, cursor: "1" }, expect.anything(), expect.anything());
  await waitFor(() => expect(result.current.data?.pages.flatMap((page) => page.items).map((item) => item.name)).toEqual(["First room", "Second room"]));
  expect(result.current.hasNextPage).toBe(false);
  expect(() => calendarResourceListContract.parse([first])).toThrow();
});
