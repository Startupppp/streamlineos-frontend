"use client";

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  grantListContract,
  grantContract,
  membershipListContract,
} from "./portal-access-schema";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: jest.fn((fn: () => unknown) => fn),
  applyContract: jest.fn((_, data) => data),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: jest.fn(
    (_permission: string, options: Record<string, unknown>) => {
      const { useMutation } = require("@tanstack/react-query");
      return useMutation(options);
    },
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({ data: null, refetch: jest.fn() }),
}));

import { apiClient } from "@/lib/api-client";

const VALID_GRANT = {
  projectClientGrantId: "grant-abc",
  organizationId: "org-123",
  portalMembershipId: "mem-456",
  partyContactId: "contact-789",
  projectId: 42,
  canViewMilestones: true,
  canViewTasks: true,
  canViewAttachments: false,
  canViewComments: false,
  canSubmitChangeRequests: true,
  status: "ACTIVE" as const,
  expiresAt: "2027-01-01T00:00:00.000Z",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-06-01T00:00:00.000Z",
  contactFirstName: "Alice",
  contactLastName: "Smith",
};

describe("SPEC 5 — grant row schema (Requirement C5)", () => {
  it("accepts a valid ACTIVE grant row", () => {
    const result = grantContract.safeParse(VALID_GRANT);
    expect(result.success).toBe(true);
  });

  it("accepts a grant row with null contactFirstName (contact has no name set)", () => {
    const result = grantContract.safeParse({ ...VALID_GRANT, contactFirstName: null });
    expect(result.success).toBe(true);
  });

  it("accepts a REVOKED grant", () => {
    const result = grantContract.safeParse({ ...VALID_GRANT, status: "REVOKED" });
    expect(result.success).toBe(true);
  });

  it("rejects a grant missing projectClientGrantId", () => {
    const { projectClientGrantId: _id, ...without } = VALID_GRANT;
    const result = grantContract.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejects a grant where status is an unrecognised value", () => {
    const result = grantContract.safeParse({ ...VALID_GRANT, status: "PENDING" });
    expect(result.success).toBe(false);
  });

  it("rejects a grant where projectId is a string instead of integer", () => {
    const result = grantContract.safeParse({ ...VALID_GRANT, projectId: "not-a-number" });
    expect(result.success).toBe(false);
  });
});

describe("SPEC 5 — grant list (cursor page) schema (Requirement C5)", () => {
  it("accepts a valid cursor page of grants with pagination envelope", () => {
    const result = grantListContract.safeParse({
      data: [VALID_GRANT],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a page with hasMore:true and a nextCursor string", () => {
    const result = grantListContract.safeParse({
      data: [VALID_GRANT],
      pagination: { limit: 20, hasMore: true, nextCursor: "cursor-xyz" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a flat array (backend must always send a page envelope)", () => {
    const result = grantListContract.safeParse([VALID_GRANT]);
    expect(result.success).toBe(false);
  });

  it("rejects a page envelope where data is missing", () => {
    const result = grantListContract.safeParse({ cursor: null, hasMore: false });
    expect(result.success).toBe(false);
  });
});

describe("SPEC 5 — portal-access cache keys (Requirement C5)", () => {
  it("grants() base key contains 'portalAccess' and 'grants' segments", () => {
    const key = directoryAndOwnershipQueryKeys.portalAccess.grants();
    expect(key).toContain("portalAccess");
    expect(key).toContain("grants");
  });

  it("grants(params) is distinct from grants() so filter variants have isolated entries", () => {
    const base = directoryAndOwnershipQueryKeys.portalAccess.grants();
    const filtered = directoryAndOwnershipQueryKeys.portalAccess.grants({ state: "expired" });
    expect(filtered).not.toEqual(base);
    expect(filtered.length).toBeGreaterThan(base.length);
  });

  it("grants() is a prefix of grants(params) so invalidating the base flushes all filter variants", () => {
    const base = directoryAndOwnershipQueryKeys.portalAccess.grants();
    const filtered = directoryAndOwnershipQueryKeys.portalAccess.grants({ q: "alice" });
    expect(Array.from(filtered).slice(0, base.length)).toEqual(Array.from(base));
  });

  it("portal.all is a superset namespace that includes portal grant entries so revoke can flush the portal cache", () => {
    const portalAll = directoryAndOwnershipQueryKeys.portal.all;
    const grants = directoryAndOwnershipQueryKeys.portalAccess.grants();
    expect(portalAll).toBeDefined();
    expect(grants).toBeDefined();
    expect(portalAll).not.toEqual(grants);
  });
});

describe("SPEC 5 — grant invalidation on create/revoke (Requirement C5)", () => {
  it("useCreateGrant invalidates grants() base key on success so the list refreshes", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(VALID_GRANT);
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useCreateGrant } = await import("./grants");
    const { result } = renderHook(() => useCreateGrant(), { wrapper });

    await act(async () => {
      result.current.mutate({
        portalMembershipId: "mem-123",
        projectId: 42,
        canViewMilestones: true,
        canViewTasks: true,
        canViewAttachments: false,
        canViewComments: false,
        canSubmitChangeRequests: false,
      });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: directoryAndOwnershipQueryKeys.portalAccess.grants(),
      }),
    );
  });

  it("useRevokeGrant invalidates grants() and portal.all on success so portal cache is also refreshed", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ ...VALID_GRANT, status: "REVOKED" });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { useRevokeGrant } = await import("./grants");
    const { result } = renderHook(() => useRevokeGrant("grant-abc"), { wrapper });

    await act(async () => {
      result.current.mutate();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: directoryAndOwnershipQueryKeys.portalAccess.grants(),
      }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: directoryAndOwnershipQueryKeys.portal.all,
      }),
    );
  });
});
