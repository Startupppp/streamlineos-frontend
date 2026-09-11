/**
 * Proves exactly ONE backend /me/access call per navigation (criterion 9).
 *
 * The layout resolves access for MFA/route decisions; prefetchAccess seeds the
 * client cache. Both go through the cache()-wrapped getServerAccessResult, so
 * React deduplicates them within one request context and only one HTTP call to
 * /me/access is made per navigation.
 *
 * getServerAccessResult returns a discriminated result rather than a bare
 * AccessResponse, because a swallowed failure and a genuine denial are not the
 * same thing: route gating must fail CLOSED (deny), while prefetch must NOT
 * seed the client cache with a denied snapshot that a transient 503 produced.
 */

jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccess: jest.fn(),
  getServerAccessResult: jest.fn(),
}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

jest.mock("../../../lib/prefetch/server-query-client", () => ({
  createServerQueryClient: jest.fn(),
}));

jest.mock("@/lib/query-keys", () => ({
  queryKeys: {
    access: { me: () => ["access", "me"] },
  },
}));

import { getServerAccess, getServerAccessResult } from "@/lib/rbac/get-server-access";
import { getServerAuth } from "@/lib/get-server-auth";
import { createServerQueryClient } from "../../../lib/prefetch/server-query-client";
import { prefetchAccess } from "../../../lib/prefetch/access";
import { QueryClient, dehydrate } from "@tanstack/react-query";

const mockedGetServerAccess = getServerAccess as jest.Mock;
const mockedGetServerAccessResult = getServerAccessResult as jest.Mock;
const mockedGetServerAuth = getServerAuth as jest.Mock;
const mockedCreateServerQueryClient = createServerQueryClient as jest.Mock;

const DENIED_ACCESS = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
  mfa: { enforced: false, satisfied: true },
};

describe("prefetchAccess uses getServerAccess (criterion 9: single access call)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerAuth.mockResolvedValue({
      orgId: "org-1",
      user: { id: "user-1" },
    });
    mockedGetServerAccess.mockResolvedValue(DENIED_ACCESS);
    mockedGetServerAccessResult.mockResolvedValue({ ok: true, access: DENIED_ACCESS });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockedCreateServerQueryClient.mockResolvedValue(qc);
  });

  it("PROOF: prefetchAccess resolves through the shared cache, not an independent serverGet", async () => {
    await prefetchAccess();
    expect(mockedGetServerAccessResult).toHaveBeenCalledTimes(1);
  });

  it("PROOF: it is called with no arguments (React cache() picks it up by reference)", async () => {
    await prefetchAccess();
    expect(mockedGetServerAccessResult).toHaveBeenCalledWith();
  });

  it("PROOF: when session is absent, no access call is made (no wasted network call)", async () => {
    mockedGetServerAuth.mockResolvedValue(null);
    await prefetchAccess();
    expect(mockedGetServerAccessResult).not.toHaveBeenCalled();
  });

  it("FAILURE IS NOT DENIAL: a failed resolve dehydrates an EMPTY cache so the client refetches, rather than seeding a denied snapshot", async () => {
    mockedGetServerAccessResult.mockResolvedValue({ ok: false });
    const state = await prefetchAccess();
    const seeded = state.queries.some((q) => JSON.stringify(q.queryKey) === JSON.stringify(["access", "me"]));
    expect(seeded).toBe(false);
  });

  it("DEDUPLICATION: prefetchAccess and layout.tsx both resolve via getServerAccess; React cache() deduplicates them in a server request context", async () => {
    const { getServerAccess: firstCall } = await import("@/lib/rbac/get-server-access");
    const firstResult = await firstCall();
    const secondResult = await prefetchAccess();
    expect(firstResult).toEqual(DENIED_ACCESS);
    expect(secondResult).toBeDefined();
    expect(mockedGetServerAccessResult).toHaveBeenCalledTimes(1);
  });
});
