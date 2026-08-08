import type { Session } from "next-auth";
import { resolveWizardGate } from "./wizard-gate";

function session(overrides: Partial<Session> = {}): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    orgId: null,
    organizationAccess: "none",
    user: {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
      role: "ORG_ADMIN",
      isOrgOwner: false,
    },
    ...overrides,
  };
}

const noCookies = {
  get: () => undefined,
};

describe("resolveWizardGate", () => {
  it("routes a suspended membership to recovery instead of organization setup", () => {
    expect(
      resolveWizardGate(
        session({
          organizationAccess: "suspended",
          suspendedOrganizationName: "Original workspace",
        }),
        noCookies,
      ),
    ).toBe("/access-suspended");
  });

  it("routes a genuinely unaffiliated account to organization setup", () => {
    expect(resolveWizardGate(session(), noCookies)).toBe("/org-setup");
  });

  it("allows a restored membership into its organization", () => {
    expect(
      resolveWizardGate(
        session({
          orgId: "org-original",
          organizationAccess: "active",
          userOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
        }),
        noCookies,
      ),
    ).toBeNull();
  });
});
