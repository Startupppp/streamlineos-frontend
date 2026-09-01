import type { Session } from "next-auth";
import { gateCookieName } from "./onboarding-gate";
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

function withCookie(name: string) {
  return {
    get: (n: string) => (n === name ? { value: "1" } : undefined),
  };
}

describe("resolveWizardGate", () => {
  describe("platform admin gap — /owner route not built", () => {
    it("an account with no orgId lands at /org-setup (platform admin cannot be distinguished in the current Session type)", () => {
      expect(
        resolveWizardGate(
          session({ orgId: null, organizationAccess: "none" }),
          noCookies,
        ),
      ).toBe("/org-setup");
    });
  });

  describe("org-owner employee-onboarding exclusion", () => {
    it("org owner with no userOnboardingCompletedAt and no cookie is NOT routed to /employee-onboarding", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            orgOnboardingCompletedAt: "2026-08-01T00:00:00.000Z",
            user: {
              id: "owner-1",
              email: "owner@example.com",
              name: "Owner",
              role: "OWNER",
              isOrgOwner: true,
            },
          }),
          noCookies,
        ),
      ).toBeNull();
    });

    it("non-owner with no userOnboardingCompletedAt and no cookie IS routed to /employee-onboarding", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
        ),
      ).toBe("/employee-onboarding");
    });
  });

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

  describe("employee onboarding gate — invariants that prevent re-trap", () => {
    it("passes when the DB stamp is present, even without a cookie (self-healed state)", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            userOnboardingCompletedAt: "2026-08-01T00:00:00.000Z",
          }),
          noCookies,
        ),
      ).toBeNull();
    });

    it("passes when the cookie is present and the DB stamp is absent (bridge window)", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
          }),
          withCookie(gateCookieName("onboarding-done", "user-1")),
        ),
      ).toBeNull();
    });

    it("fires when the DB stamp is absent and no cookie exists (cross-device re-trap without fix)", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
          }),
          noCookies,
        ),
      ).toBe("/employee-onboarding");
    });
  });

  describe("org-setup gate — invariants that prevent re-trap", () => {
    it("passes when the DB stamp is present, even without a cookie (self-healed state)", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            user: {
              id: "owner-1",
              email: "owner@example.com",
              name: "Owner",
              role: "OWNER",
              isOrgOwner: true,
            },
            orgOnboardingCompletedAt: "2026-08-01T00:00:00.000Z",
          }),
          noCookies,
        ),
      ).toBeNull();
    });

    it("passes when the cookie is present and the DB stamp is absent (bridge window)", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            user: {
              id: "owner-1",
              email: "owner@example.com",
              name: "Owner",
              role: "OWNER",
              isOrgOwner: true,
            },
          }),
          withCookie(gateCookieName("org-setup-done", "org-1")),
        ),
      ).toBeNull();
    });

    it("fires when the DB stamp is absent and no cookie exists", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            user: {
              id: "owner-1",
              email: "owner@example.com",
              name: "Owner",
              role: "OWNER",
              isOrgOwner: true,
            },
          }),
          noCookies,
        ),
      ).toBe("/org-setup");
    });
  });
});
