import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCalendarOfflinePolicy } from "./calendar-offline-policy";

const get = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

it("rechecks a fresh cached offline policy when a review mounts", async () => {
  get.mockReset().mockResolvedValue({ enabled: false, maxAgeDays: 1, version: 2 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(platformHierarchyQueryKeys.calendar.offlinePolicy("org-1", "user-1"), {
    enabled: true, maxAgeDays: 7, version: 1,
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const { result } = renderHook(() => useCalendarOfflinePolicy(), { wrapper });
  await waitFor(() => expect(get).toHaveBeenCalledWith("/calendar/offline-policy", undefined, expect.anything(), expect.anything()));
  await waitFor(() => expect(result.current.data).toEqual({ enabled: false, maxAgeDays: 1, version: 2 }));
  expect(result.current.isFetchedAfterMount).toBe(true);
  client.clear();
});
