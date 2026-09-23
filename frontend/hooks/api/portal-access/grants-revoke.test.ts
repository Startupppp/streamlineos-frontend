import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useRevokeGrant } from "./grants";

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: true, scopes: {} },
    refetch: jest.fn(() =>
      Promise.resolve({ data: { isOrgOwner: true, scopes: {} } }),
    ),
  })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn() },
}));

const { apiClient } = jest.requireMock("@/lib/api-client") as {
  apiClient: { post: jest.Mock };
};

const REVOKED_GRANT = {
  projectClientGrantId: "grant-1",
  organizationId: "org-1",
  portalMembershipId: "mem-1",
  partyContactId: "contact-1",
  projectId: 42,
  canViewMilestones: false,
  canViewTasks: false,
  canViewAttachments: false,
  canViewComments: false,
  canSubmitChangeRequests: false,
  status: "REVOKED",
  expiresAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-22T10:00:00.000Z",
  contactFirstName: null,
  contactLastName: null,
};

function wrap(client: ReturnType<typeof createAppQueryClient>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("portal query key prefix shape (static assertions — do not execute useRevokeGrant)", () => {
  it("portal.all is a non-empty static array", () => {
    const all = directoryAndOwnershipQueryKeys.portal.all;
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it("portal.projects() starts with portal.all", () => {
    const all = directoryAndOwnershipQueryKeys.portal.all;
    const list = directoryAndOwnershipQueryKeys.portal.projects();
    expect(list.slice(0, all.length)).toEqual([...all]);
  });

  it("portal.projectOverview(id) starts with portal.all for any projectId", () => {
    const all = directoryAndOwnershipQueryKeys.portal.all;
    for (const id of [1, 42, 9999]) {
      const ov = directoryAndOwnershipQueryKeys.portal.projectOverview(id);
      expect(ov.slice(0, all.length)).toEqual([...all]);
    }
  });
});

describe("useRevokeGrant — portal projection cache is purged on success", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.post.mockResolvedValue(REVOKED_GRANT);
  });

  it("marks portal.projects() stale so a mounted project list is refetched after revoke", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    client.setQueryData(directoryAndOwnershipQueryKeys.portal.projects(), {
      data: [{ projectId: 42, name: "Alpha" }],
    });
    expect(
      client.getQueryState(directoryAndOwnershipQueryKeys.portal.projects())?.isInvalidated,
    ).toBe(false);

    const { result } = renderHook(() => useRevokeGrant("grant-1"), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(
      client.getQueryState(directoryAndOwnershipQueryKeys.portal.projects())?.isInvalidated,
    ).toBe(true);
  });

  it("marks portal.projectOverview(id) stale for a cached project overview", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    client.setQueryData(directoryAndOwnershipQueryKeys.portal.projectOverview(42), {
      projectId: 42,
      grants: [{ projectClientGrantId: "grant-1", status: "ACTIVE" }],
    });
    expect(
      client.getQueryState(directoryAndOwnershipQueryKeys.portal.projectOverview(42))?.isInvalidated,
    ).toBe(false);

    const { result } = renderHook(() => useRevokeGrant("grant-1"), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(
      client.getQueryState(directoryAndOwnershipQueryKeys.portal.projectOverview(42))?.isInvalidated,
    ).toBe(true);
  });

  it("marks the grants list stale", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");
    client.setQueryData(directoryAndOwnershipQueryKeys.portalAccess.grants(), {
      data: [{ projectClientGrantId: "grant-1", status: "ACTIVE" }],
    });

    const { result } = renderHook(() => useRevokeGrant("grant-1"), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(
      client.getQueryState(directoryAndOwnershipQueryKeys.portalAccess.grants())?.isInvalidated,
    ).toBe(true);
  });

  it("writes the revoke response into the individual grant cache entry", async () => {
    const client = createAppQueryClient("authenticated:org-1:u-1");

    const { result } = renderHook(() => useRevokeGrant("grant-1"), {
      wrapper: wrap(client),
    });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(
      client.getQueryData(
        directoryAndOwnershipQueryKeys.portalAccess.grant("grant-1"),
      ),
    ).toEqual(REVOKED_GRANT);
  });
});
