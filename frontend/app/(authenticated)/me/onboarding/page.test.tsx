/** @jest-environment node */

jest.mock("server-only", () => ({}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccess: jest.fn(),
}));

jest.mock("@/lib/rbac/require-permission", () => ({
  requireModulePermission: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/hr/onboarding/my-onboarding-tasks-page", () => ({
  MyOnboardingTasksPage: () => null,
}));

import { redirect } from "next/navigation";
import { getServerAccess } from "@/lib/rbac/get-server-access";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import MyOnboardingRoute from "@/app/(authenticated)/me/onboarding/page";

const mockedGetServerAccess = getServerAccess as jest.Mock;
const mockedRequireModulePermission = requireModulePermission as jest.Mock;
const mockedRedirect = redirect as unknown as jest.Mock;

describe("MyOnboardingRoute — access guards", () => {
  beforeEach(() => jest.clearAllMocks());

  it("redirects org owners to /dashboard before reaching requireModulePermission", async () => {
    mockedGetServerAccess.mockResolvedValueOnce({
      isOrgOwner: true,
      scopes: {},
      modules: {},
      canManageOrganizationMembership: false,
    });

    await expect(MyOnboardingRoute()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
    expect(mockedRequireModulePermission).not.toHaveBeenCalled();
  });

  it("allows non-owner members through and calls requireModulePermission", async () => {
    mockedGetServerAccess.mockResolvedValueOnce({
      isOrgOwner: false,
      scopes: {},
      modules: { hr: true },
      canManageOrganizationMembership: false,
    });

    await MyOnboardingRoute();

    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(mockedRequireModulePermission).toHaveBeenCalledWith("hr", "self:onboarding-tasks");
  });
});
