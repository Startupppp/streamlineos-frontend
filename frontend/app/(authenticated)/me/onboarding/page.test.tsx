/** @jest-environment node */

jest.mock("server-only", () => ({}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("@/lib/rbac/require-permission", () => ({
  requirePermission: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/features/hr/onboarding/my-onboarding-tasks-page", () => ({
  MyOnboardingTasksPage: () => null,
}));

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import MyOnboardingRoute from "@/app/(authenticated)/me/onboarding/page";

const mockedRequirePermission = requirePermission as jest.Mock;
/* `redirect` returns `never`, which does not overlap jest.Mock. */
const mockedRedirect = jest.mocked(redirect);

describe("MyOnboardingRoute — /me/* is universal, so nobody is bounced off it", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders for an org owner instead of redirecting them to the dashboard", async () => {
    await MyOnboardingRoute();

    expect(mockedRedirect).not.toHaveBeenCalled();
    expect(mockedRequirePermission).toHaveBeenCalledWith("self:onboarding-tasks");
  });

  it("gates on the self-service permission and nothing else", async () => {
    await MyOnboardingRoute();

    expect(mockedRequirePermission).toHaveBeenCalledTimes(1);
  });
});
