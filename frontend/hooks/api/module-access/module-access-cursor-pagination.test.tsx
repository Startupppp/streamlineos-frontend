import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import type { AccessResponse } from "@/types/access";
import { queryKeys } from "@/lib/query-keys";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { get: jest.Mock };
};

const MODULE = "hr";

function makeClient(permissions: string[]): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const access: AccessResponse = {
    scopes: Object.fromEntries(permissions.map((k) => [k, "all"])) as AccessResponse["scopes"],
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: { HR: true },
  };
  client.setQueryData(queryKeys.access.me(), access);
  return client;
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function urlsFor(fragment: string): string[] {
  return apiClient.get.mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.includes(fragment));
}

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockImplementation((url: string) => {
    if (url === "/me/access") return Promise.resolve({});
    if (url.includes("/members")) {
      return Promise.resolve(
        url.includes("cursor=")
          ? { data: [{ id: 2 }], hasMore: false, nextCursor: null }
          : { data: [{ id: 1 }], hasMore: true, nextCursor: 41 },
      );
    }
    if (url.includes("/audit-log")) {
      return Promise.resolve(
        url.includes("cursor=")
          ? { data: [{ id: "b" }], pagination: { limit: 20, nextCursor: null, hasMore: false } }
          : { data: [{ id: "a" }], pagination: { limit: 20, nextCursor: "tok-9", hasMore: true } },
      );
    }
    return Promise.resolve({ data: [], hasMore: false, nextCursor: null });
  });
});

describe("module access rosters paginate by cursor, never by offset", () => {
  it("asks for members without a page number and walks forward on nextCursor", async () => {
    const client = makeClient([`${MODULE}:access:view`]);
    const { useModuleMembersInfinite } = await import("./members");
    const { result } = renderHook(() => useModuleMembersInfinite(MODULE, 20), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = urlsFor("/members");
    expect(first).toHaveLength(1);
    expect(first[0]).not.toContain("page=");
    expect(first[0]).not.toContain("cursor=");

    result.current.fetchNextPage();
    await waitFor(() => expect(urlsFor("/members")).toHaveLength(2));
    expect(urlsFor("/members")[1]).toContain("cursor=41");
    expect(urlsFor("/members")[1]).not.toContain("page=");
  });

  it("asks for the audit log by limit and opaque cursor, never by page", async () => {
    const client = makeClient([`${MODULE}:access:view`]);
    const { useModuleAuditLog } = await import("./catalog");
    const { result } = renderHook(() => useModuleAuditLog(MODULE, 20), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(urlsFor("/audit-log")[0]).toContain("limit=20");
    expect(urlsFor("/audit-log")[0]).not.toContain("page=");

    result.current.fetchNextPage();
    await waitFor(() => expect(urlsFor("/audit-log")).toHaveLength(2));
    expect(urlsFor("/audit-log")[1]).toContain("cursor=tok-9");
    expect(urlsFor("/audit-log")[1]).not.toContain("page=");
  });

  it("asks for member candidates without a page number", async () => {
    const client = makeClient([`${MODULE}:access:manage`]);
    const { useModuleMemberCandidates } = await import("./members");
    const { result } = renderHook(() => useModuleMemberCandidates(MODULE, 50, ""), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const urls = urlsFor("/member-candidates");
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("pageSize=50");
    expect(urls[0]).not.toContain("page=1");
  });
});
