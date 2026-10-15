import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalendarSavedViews } from "./calendar-saved-views";

const get = jest.fn();
let accessSnapshot: {
  membershipId: number;
  version: number;
  isOrgOwner: boolean;
  scopes: Record<string, "all" | "own">;
} = {
  membershipId: 7,
  version: 1,
  isOrgOwner: false,
  scopes: { "calendar:read": "all", "directory:people:view": "all" },
};

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: accessSnapshot }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

it("does not expose cached saved views after access or membership narrows", async () => {
  accessSnapshot = {
    membershipId: 7,
    version: 1,
    isOrgOwner: false,
    scopes: { "calendar:read": "all", "directory:people:view": "all" },
  };
  get.mockReset().mockImplementation(async () => ({
    items: [{ name: `${accessSnapshot.membershipId}:${accessSnapshot.scopes["directory:people:view"]}` }],
    nextCursor: null,
    actorMembershipId: accessSnapshot.membershipId,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const { result, rerender } = renderHook(() => useCalendarSavedViews(), { wrapper: wrapper(client) });

  await waitFor(() => expect(result.current.data?.pages[0]?.items[0]?.name).toBe("7:all"));
  accessSnapshot = { ...accessSnapshot, scopes: { "calendar:read": "all", "directory:people:view": "own" } };
  rerender();
  expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(result.current.data?.pages[0]?.items[0]?.name).toBe("7:own"));

  accessSnapshot = { ...accessSnapshot, membershipId: 8, version: 2 };
  rerender();
  expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(result.current.data?.pages[0]?.items[0]?.name).toBe("8:own"));

  accessSnapshot = { ...accessSnapshot, scopes: {} };
  rerender();
  expect(result.current.data).toBeUndefined();
  expect(get).toHaveBeenCalledTimes(3);
});
