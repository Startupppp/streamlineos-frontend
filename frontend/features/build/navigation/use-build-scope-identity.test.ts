import { renderHook } from "@testing-library/react";
import { ORGANIZATION_BUILD_SCOPE } from "@/lib/build/build-scope";

let mockSessionData: { orgId?: string } | null = null;
let mockOrganizations: { id: string; name: string; slug: string; role: string; joinedAt: null }[] | undefined = undefined;

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSessionData }),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useGetOrganizations: () => ({ data: mockOrganizations }),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: undefined, isLoading: false, isError: false, error: null }),
}));

let mockProductError: unknown = null;
let mockRecents: { key: string; name: string }[] = [];

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: () => ({ data: undefined, isLoading: false, isError: mockProductError !== null, error: mockProductError }),
}));

jest.mock("./use-build-nav-preferences", () => ({
  useBuildScopeRecents: () => ({ recents: mockRecents }),
  useBuildScopeStars: () => ({ starred: [] }),
}));

import { useBuildScopeIdentity } from "./use-build-scope-identity";

beforeEach(() => {
  mockSessionData = null;
  mockOrganizations = undefined;
  mockProductError = null;
  mockRecents = [];
});

it("treats a 404 product (another tenant's id) as inaccessible and drops any remembered name (MP-B-021)", () => {
  const { ApiError } = jest.requireActual("@/lib/api-envelope") as typeof import("@/lib/api-envelope");
  mockProductError = new ApiError("Not found", 404, "NOT_FOUND");
  mockRecents = [{ key: "product:3", name: "Remembered product" }];

  const { result } = renderHook(() => useBuildScopeIdentity({ type: "product", managedProductId: 3, projectId: null, basePath: "/build/managed-products/3" }));

  expect(result.current.isInaccessible).toBe(true);
  expect(result.current.ref.name).toBe("");
});

it("returns the active organisation name for the organisation scope", () => {
  mockOrganizations = [
    { id: "org-1", name: "QA Build Org 1012b", slug: "qa-build", role: "admin", joinedAt: null },
  ];
  mockSessionData = { orgId: "org-1" };

  const { result } = renderHook(() => useBuildScopeIdentity(ORGANIZATION_BUILD_SCOPE));

  expect(result.current.ref.name).toBe("QA Build Org 1012b");
  expect(result.current.isLoading).toBe(false);
});

it("shows loading while organisations are being fetched for the organisation scope", () => {
  mockOrganizations = undefined;
  mockSessionData = { orgId: "org-1" };

  const { result } = renderHook(() => useBuildScopeIdentity(ORGANIZATION_BUILD_SCOPE));

  expect(result.current.isLoading).toBe(true);
});

it("falls back to the first organisation when the session org id has no match", () => {
  mockOrganizations = [
    { id: "org-2", name: "Fallback Org", slug: "fallback", role: "member", joinedAt: null },
  ];
  mockSessionData = { orgId: "org-unknown" };

  const { result } = renderHook(() => useBuildScopeIdentity(ORGANIZATION_BUILD_SCOPE));

  expect(result.current.ref.name).toBe("Fallback Org");
});
