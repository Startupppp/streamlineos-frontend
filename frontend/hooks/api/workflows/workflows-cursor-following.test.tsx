import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { AccessResponse } from "@/types/access";
import { queryKeys } from "@/lib/query-keys";

/**
 * PRD-C124 (frontend states) — the workflows list hooks follow the cursor the server
 * sends instead of rendering page one and stopping.
 *
 * `GET /workflows/schedules` and `GET /workflows/secrets` have always returned
 * `{ data, pagination: { limit, nextCursor, hasMore } }`. Both hooks were plain
 * `useQuery` calls with no `getNextPageParam`, and both pages rendered `data.data`,
 * so an organisation past one page saw a truncated list with nothing on screen
 * saying so — the failure mode is a schedule that appears not to exist and a secret
 * an operator believes was deleted.
 *
 * The assertion is on the SECOND request carrying the first response's `nextCursor`,
 * not on the hook's shape: a hook that returned `{ pages: [...] }` while still never
 * asking for page two would satisfy a shape check and fail this.
 */
jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

const ACCESS: AccessResponse = {
  scopes: {
    "workflows:schedules:manage": "all",
    "workflows:secrets:manage": "all",
  } as AccessResponse["scopes"],
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { WORKFLOWS: true },
};

function page(rows: { id: string }[], nextCursor: string | null) {
  return { data: rows, pagination: { limit: 2, nextCursor, hasMore: nextCursor !== null } };
}

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** Serves page one with a cursor, then page two, for whichever route is asked. */
function serveTwoPages(route: string) {
  apiClient.get.mockImplementation((url: string, params?: Record<string, unknown>) => {
    if (url !== route) return Promise.resolve(ACCESS);
    if (params?.cursor === "cursor-1")
      return Promise.resolve(page([{ id: "row-3" }], null));
    return Promise.resolve(page([{ id: "row-1" }, { id: "row-2" }], "cursor-1"));
  });
}

describe.each([
  ["/workflows/schedules", "useAllSchedules", "../workflows-schedules"],
  ["/workflows/secrets", "useGlobalSecrets", "../workflows-secrets"],
])("%s follows its cursor", (route, hookName, modulePath) => {
  beforeEach(() => {
    apiClient.get.mockReset();
    serveTwoPages(route);
  });

  it("asks for page two with the nextCursor the first page returned", async () => {
    const mod = (await import(modulePath)) as Record<string, () => unknown>;
    const useHook = mod[hookName];
    expect(typeof useHook).toBe("function");

    const { result } = renderHook(() => useHook(), { wrapper: makeWrapper() });
    const hook = () =>
      result.current as {
        data?: { pages: { data: { id: string }[] }[] };
        hasNextPage: boolean;
        fetchNextPage: () => Promise<unknown>;
      };

    await waitFor(() => expect(hook().data?.pages).toHaveLength(1));
    expect(hook().hasNextPage).toBe(true);

    await act(async () => {
      await hook().fetchNextPage();
    });

    await waitFor(() => expect(hook().data?.pages).toHaveLength(2));
    expect(apiClient.get).toHaveBeenCalledWith(
      route,
      { cursor: "cursor-1" },
      expect.any(AbortSignal),
      expect.any(Function),
    );

    const rows = (hook().data?.pages ?? []).flatMap((p) => p.data);
    expect(rows.map((r) => r.id)).toEqual(["row-1", "row-2", "row-3"]);
    expect(hook().hasNextPage).toBe(false);
  });

  it("does not send a cursor param on the first page", async () => {
    const mod = (await import(modulePath)) as Record<string, () => unknown>;
    const useHook = mod[hookName];
    const { result } = renderHook(() => useHook(), { wrapper: makeWrapper() });

    await waitFor(() =>
      expect((result.current as { data?: unknown }).data).toBeDefined(),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      route,
      undefined,
      expect.any(AbortSignal),
      expect.any(Function),
    );
  });
});
