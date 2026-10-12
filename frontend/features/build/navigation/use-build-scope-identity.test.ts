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

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: () => ({ data: undefined, isLoading: false, isError: false, error: null }),
}));

jest.mock("./use-build-nav-preferences", () => ({
  useBuildScopeRecents: () => ({ recents: [] }),
  useBuildScopeStars: () => ({ starred: [] }),
}));

import { useBuildScopeIdentity } from "./use-build-scope-identity";

beforeEach(() => {
  mockSessionData = null;
  mockOrganizations = undefined;
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
