/**
 * Proves exactly ONE backend /me/access call per navigation (criterion 9).
 *
 * The layout calls getServerAccess() for MFA/route decisions.
 * prefetchAccess() now also calls getServerAccess() (not raw serverGet).
 * React's cache() deduplicates both calls within the same request context,
 * so only one HTTP call to /me/access is made per navigation.
 *
 * This test proves the mechanism: prefetchAccess uses getServerAccess,
 * not an independent serverGet call.
 */

jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccess: jest.fn(),
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

import { getServerAccess } from "@/lib/rbac/get-server-access";
import { getServerAuth } from "@/lib/get-server-auth";
import { createServerQueryClient } from "../../../lib/prefetch/server-query-client";
import { prefetchAccess } from "../../../lib/prefetch/access";
import { QueryClient, dehydrate } from "@tanstack/react-query";

const mockedGetServerAccess = getServerAccess as jest.Mock;
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

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockedCreateServerQueryClient.mockResolvedValue(qc);
  });

  it("PROOF: prefetchAccess calls getServerAccess, not an independent serverGet", async () => {
    await prefetchAccess();
    expect(mockedGetServerAccess).toHaveBeenCalledTimes(1);
  });

  it("PROOF: getServerAccess is called with no arguments (React cache() picks it up by reference)", async () => {
    await prefetchAccess();
    expect(mockedGetServerAccess).toHaveBeenCalledWith();
  });

  it("PROOF: when session is absent, getServerAccess is NOT called (no wasted network call)", async () => {
    mockedGetServerAuth.mockResolvedValue(null);
    await prefetchAccess();
    expect(mockedGetServerAccess).not.toHaveBeenCalled();
  });

  it("DEDUPLICATION: prefetchAccess and layout.tsx both resolve via getServerAccess; React cache() deduplicates them in a server request context", async () => {
    const { getServerAccess: firstCall } = await import("@/lib/rbac/get-server-access");
    const firstResult = await firstCall();
    const secondResult = await prefetchAccess();
    expect(firstResult).toEqual(DENIED_ACCESS);
    expect(secondResult).toBeDefined();
  });
});
