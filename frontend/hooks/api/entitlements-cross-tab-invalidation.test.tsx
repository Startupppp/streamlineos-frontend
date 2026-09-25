import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ENTITLEMENTS_INVALIDATION_KEY_PREFIX,
  signalEntitlementsInvalidation,
  useEntitlements,
} from "@/hooks/api/entitlements";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";

let mockOrgId = "org-alpha";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: mockOrgId } }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn().mockResolvedValue({ lockedModules: [] }) },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => unknown) => fn,
}));

jest.mock("@/hooks/api/entitlements-schema", () => ({
  entitlementsContract: { parse: (value: unknown) => value },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  localStorage.clear();
  mockOrgId = "org-alpha";
});

describe("entitlements cross-tab invalidation", () => {
  it("writes an organization-scoped signal", () => {
    signalEntitlementsInvalidation("org-alpha");
    expect(localStorage.getItem(`${ENTITLEMENTS_INVALIDATION_KEY_PREFIX}:org-alpha`)).toBeTruthy();
  });

  it("invalidates only for the active organization", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    renderHook(() => useEntitlements(), { wrapper: wrapper(client) });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ENTITLEMENTS_INVALIDATION_KEY_PREFIX}:org-beta`,
          newValue: "1",
        }),
      );
    });
    expect(invalidateSpy).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ENTITLEMENTS_INVALIDATION_KEY_PREFIX}:org-alpha`,
          newValue: "2",
        }),
      );
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: growthAndSignQueryKeys.billing.entitlements(),
    });
  });

  it("removes the storage listener on unmount", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { unmount } = renderHook(() => useEntitlements(), { wrapper: wrapper(client) });
    unmount();

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${ENTITLEMENTS_INVALIDATION_KEY_PREFIX}:org-alpha`,
          newValue: "1",
        }),
      );
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
