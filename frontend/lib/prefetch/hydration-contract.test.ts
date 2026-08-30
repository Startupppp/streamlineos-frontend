/**
 * The contract nothing else can check: a snapshot dehydrated on the SERVER must
 * be readable by the app's own client.
 *
 * When it was broken, every prefetch factory built a plain QueryClient while the
 * app hashed keys with the signed-in scope prefixed. The entry hydrated fine and
 * held its data — `getQueryData` on the identical key just returned undefined,
 * so the page refetched. Typecheck, the whole suite and `next build` all passed.
 * Only a test that hydrates one client's dehydrated state into the other can
 * catch it.
 */
jest.mock("server-only", () => ({}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

jest.mock("@/lib/server-fetch", () => ({
  serverGet: jest.fn(),
}));

import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope, scopedQueryKeyHashFn } from "@/lib/query-scope";
import { getServerAuth } from "@/lib/get-server-auth";
import { serverGet } from "@/lib/server-fetch";
import { prefetchAccess } from "./access";
import { prefetchRoles } from "./roles";
import { prefetchWorkers } from "./directory";
import { prefetchHrDocuments, prefetchHrAssets } from "./hr";
import { prefetchPayrollRuns } from "./payroll";
import { workersListKey } from "@/lib/query-keys/directory-workers-list";

const ORG = "org-a";
const USER = "user-1";
const PAYLOAD = { isOrgOwner: false, modules: {}, scopes: { "hr:employees:view": "all" } };

function serverClient(scope: string) {
  return new QueryClient({
    defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(scope) } },
  });
}

describe("server prefetch → client cache", () => {
  const key = queryKeys.access.me();

  it("a snapshot dehydrated with the request's scope is readable by the app's client", () => {
    const scope = authenticatedScope(ORG, USER);

    const server = serverClient(scope);
    server.setQueryData(key, PAYLOAD);
    const state = dehydrate(server);

    const app = createAppQueryClient(scope);
    hydrate(app, state);

    expect(app.getQueryData(key)).toEqual(PAYLOAD);
  });

  it("a plain QueryClient produces an entry the app can never look up — the original defect", () => {
    const server = new QueryClient();
    server.setQueryData(key, PAYLOAD);
    const state = dehydrate(server);

    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    // The entry IS in the cache holding its data. That is what made this look
    // like success for as long as it did.
    expect(app.getQueryCache().getAll()).toHaveLength(1);
    expect(app.getQueryCache().getAll()[0]?.state.data).toEqual(PAYLOAD);
    // And it is unreachable by the key the app asks with.
    expect(app.getQueryData(key)).toBeUndefined();
  });

  it("another person's scope cannot read the snapshot, which is why the hash is scoped at all", () => {
    const server = serverClient(authenticatedScope(ORG, USER));
    server.setQueryData(key, PAYLOAD);
    const state = dehydrate(server);

    const otherPerson = createAppQueryClient(authenticatedScope(ORG, "user-2"));
    hydrate(otherPerson, state);

    expect(otherPerson.getQueryData(key)).toBeUndefined();
  });

  it("the scope string is built one way, so the server and the client cannot drift apart", () => {
    // The client builds it from a session that may be missing either field.
    expect(authenticatedScope(undefined, undefined)).toBe("authenticated::");
    expect(authenticatedScope(ORG, USER)).toBe(`authenticated:${ORG}:${USER}`);
    expect(scopedQueryKeyHashFn("s")(["a", "b"])).toBe(JSON.stringify(["s", ["a", "b"]]));
  });
});

/**
 * The tests above prove the mechanism. These run the REAL factories, because a
 * factory quietly reverting to `new QueryClient()` is the way this regresses —
 * and every existing factory test mocks the factory out entirely, which is
 * exactly why the defect survived.
 */
describe("the shipped prefetch factories honour that contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerAuth as jest.Mock).mockResolvedValue({
      orgId: ORG,
      user: { id: USER },
    });
  });

  it("prefetchAccess dehydrates a snapshot the app can actually read", async () => {
    (serverGet as jest.Mock).mockResolvedValue(PAYLOAD);

    const state = await prefetchAccess();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.access.me())).toEqual(PAYLOAD);
  });

  it("prefetchRoles dehydrates a page the app can actually read", async () => {
    const page = {
      data: [{ id: 1, name: "Accounting Module Admin" }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    (serverGet as jest.Mock).mockResolvedValue(page);

    const state = await prefetchRoles();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.roles.list({ page: 1, limit: 20 }))).toEqual(page);
  });

  it("returns an empty scoped snapshot when the server access read fails", async () => {
    (serverGet as jest.Mock).mockRejectedValue(new Error("backend unavailable"));

    const state = await prefetchAccess();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.access.me())).toBeUndefined();
    expect(state.queries).toHaveLength(0);
  });

  it("prefetchWorkers dehydrates a page the app can actually read", async () => {
    const page = {
      data: [{ id: "worker-1", name: "Alice" }],
      total: 1,
      page: 1,
      limit: 20,
    };
    (serverGet as jest.Mock).mockResolvedValue(page);

    const state = await prefetchWorkers();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(workersListKey())).toEqual(page);
  });

  it("prefetchHrDocuments dehydrates data the app can actually read", async () => {
    const response = {
      data: [{ id: 1, name: "Offer Letter" }],
      pageInfo: { limit: 20, hasMore: false, nextCursor: null },
    };
    (serverGet as jest.Mock).mockResolvedValue(response);

    const state = await prefetchHrDocuments();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.hr.documents({ limit: 20 }))).toEqual(response);
  });

  it("prefetchHrAssets dehydrates data the app can actually read", async () => {
    const response = {
      data: [{ id: 1, name: "Laptop" }],
      counts: { total: 1, available: 0, assigned: 1, maintenance: 0, retired: 0 },
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    (serverGet as jest.Mock).mockResolvedValue(response);

    const state = await prefetchHrAssets();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.hr.assets({ page: 1, limit: 20 }))).toEqual(response);
  });

  it("prefetchPayrollRuns dehydrates data the app can actually read", async () => {
    const response = {
      data: [{ id: 1, status: "completed" }],
      pagination: { limit: 20, nextCursor: null, hasMore: false },
    };
    (serverGet as jest.Mock).mockResolvedValue(response);

    const state = await prefetchPayrollRuns();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.payroll.runs({ cursor: undefined, limit: 20 }))).toEqual(response);
  });
});

describe("scope construction", () => {
  it("is stable", () => {
    // The client builds it from a session that may be missing either field.
    expect(authenticatedScope(undefined, undefined)).toBe("authenticated::");
    expect(authenticatedScope(ORG, USER)).toBe(`authenticated:${ORG}:${USER}`);
    expect(scopedQueryKeyHashFn("s")(["a", "b"])).toBe(JSON.stringify(["s", ["a", "b"]]));
  });
});
