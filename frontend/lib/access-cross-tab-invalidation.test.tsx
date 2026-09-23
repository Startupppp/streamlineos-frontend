import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccess, signalAccessInvalidation, ACCESS_INVALIDATION_KEY_PREFIX, useModuleEnabled } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

let mockOrgId = "org-alpha";
let mockUserId = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { orgId: mockOrgId, user: { id: mockUserId } },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn().mockResolvedValue({ isOrgOwner: false, scopes: {}, modules: {}, canManageOrganizationMembership: false }) },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => unknown) => fn,
}));

jest.mock("@/hooks/api/access-schema", () => ({
  accessResponseContract: { parse: (v: unknown) => v },
}));

jest.mock("@/lib/rbac/permission-gate", () => ({
  permissionGate: () => ({ allowed: false }),
  grantsPermission: () => false,
  gated: (q: unknown) => q,
}));

jest.mock("@/lib/rbac/gate", () => ({
  accessState: (s: unknown) => s,
}));

jest.mock("@/lib/org-module-keys", () => ({
  normalizeOrgModuleKey: (k: string) => k,
}));

function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockOrgId = "org-alpha";
  mockUserId = "user-1";
});

describe("BSN-04-035 — access permission cross-tab invalidation", () => {
  it("signalAccessInvalidation writes a scoped key so only the matching org's tabs respond", () => {
    signalAccessInvalidation("org-alpha");
    expect(localStorage.getItem(`${ACCESS_INVALIDATION_KEY_PREFIX}:org-alpha`)).toBeTruthy();
  });

  it("org-beta and org-alpha write distinct storage keys so cross-org tabs never receive the signal", () => {
    const keyA = `${ACCESS_INVALIDATION_KEY_PREFIX}:org-alpha`;
    const keyB = `${ACCESS_INVALIDATION_KEY_PREFIX}:org-beta`;
    expect(keyA).not.toBe(keyB);
  });

  it("a storage event keyed to the same org causes useAccess to call invalidateQueries with the access.me() key", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    renderHook(() => useAccess(), { wrapper: wrap(client) });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ACCESS_INVALIDATION_KEY_PREFIX}:org-alpha`,
          newValue: Date.now().toString(),
        }),
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: platformCoreQueryKeys.access.me(),
    });
  });

  it("a storage event keyed to a different org does NOT cause invalidation in the current org's tab", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    renderHook(() => useAccess(), { wrapper: wrap(client) });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ACCESS_INVALIDATION_KEY_PREFIX}:org-beta`,
          newValue: Date.now().toString(),
        }),
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("a storage event with a key that does not carry the org prefix does NOT cause invalidation", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    renderHook(() => useAccess(), { wrapper: wrap(client) });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "some-unrelated-key",
          newValue: "1",
        }),
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("signalAccessInvalidation followed by a storage event causes invalidation in the same-org tab", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    renderHook(() => useAccess(), { wrapper: wrap(client) });

    act(() => {
      signalAccessInvalidation("org-alpha");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ACCESS_INVALIDATION_KEY_PREFIX}:org-alpha`,
          newValue: localStorage.getItem(`${ACCESS_INVALIDATION_KEY_PREFIX}:org-alpha`),
        }),
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: platformCoreQueryKeys.access.me(),
    });
  });

  it("the storage listener is removed on unmount so stale listeners do not accumulate and fire after hook is gone", () => {
    const client = makeClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    const { unmount } = renderHook(() => useAccess(), { wrapper: wrap(client) });
    unmount();

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ACCESS_INVALIDATION_KEY_PREFIX}:org-alpha`,
          newValue: "1",
        }),
      );
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("BSN-04-A08 — useModuleEnabled shares the access invalidation path so capability changes reconcile cross-tab", () => {
  it("after a storage event for the same org, useModuleEnabled reflects the updated module state without a manual refresh", async () => {
    jest.mocked(apiClient.get).mockResolvedValueOnce({
      isOrgOwner: false,
      scopes: {},
      modules: { build: true },
      canManageOrganizationMembership: false,
    });

    const client = makeClient();
    const { result } = renderHook(() => useModuleEnabled("build"), { wrapper: wrap(client) });

    await waitFor(() => expect(result.current).toBe(true));

    jest.mocked(apiClient.get).mockResolvedValueOnce({
      isOrgOwner: false,
      scopes: {},
      modules: { build: false },
      canManageOrganizationMembership: false,
    });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ACCESS_INVALIDATION_KEY_PREFIX}:org-alpha`,
          newValue: Date.now().toString(),
        }),
      );
    });

    await waitFor(() => expect(result.current).toBe(false));
  });
});
