import type { Session } from "next-auth";
import { gateCookieName, GATE_COOKIE_MAX_AGE, ONBOARDING_DEFERRED_MAX_AGE } from "./onboarding-gate";
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
  describe("platform operator routes to /owner, never into a wizard", () => {
    it("a platform operator with no organization lands at /owner, not /org-setup", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: null,
            organizationAccess: "none",
            isPlatformAdmin: true,
          }),
          noCookies,
          "/",
        ),
      ).toBe("/owner");
    });

    it("an ordinary account with no organization still lands at /org-setup", () => {
      expect(
        resolveWizardGate(
          session({ orgId: null, organizationAccess: "none" }),
          noCookies,
          "/",
        ),
      ).toBe("/org-setup");
    });

    it("a suspended membership still wins over operator standing", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: null,
            organizationAccess: "suspended",
            isPlatformAdmin: true,
          }),
          noCookies,
          "/",
        ),
      ).toBe("/access-suspended");
    });

    it("an operator who also belongs to an organization is admitted to it, not diverted", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            isPlatformAdmin: true,
            userOnboardingCompletedAt: "2026-01-01T00:00:00.000Z",
          }),
          noCookies,
          "/dashboard",
        ),
      ).toBeNull();
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
          "/hr/directory",
        ),
      ).toBeNull();
    });

    it("non-owner with no userOnboardingCompletedAt and no cookie IS routed to /employee-onboarding when HR is enabled", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "/hr/directory",
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
        "/",
      ),
    ).toBe("/access-suspended");
  });

  it("routes a genuinely unaffiliated account to organization setup", () => {
    expect(resolveWizardGate(session(), noCookies, "/")).toBe("/org-setup");
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
        "/dashboard",
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
          "/hr/directory",
        ),
      ).toBeNull();
    });

    it("passes when the cookie is present and the DB stamp is absent (bridge window)", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
          }),
          withCookie(gateCookieName("onboarding-done", "user-1--org-1")),
          "/hr/directory",
        ),
      ).toBeNull();
    });

    it("does not accept a cookie scoped to the user alone", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
          }),
          withCookie(gateCookieName("onboarding-done", "user-1")),
          "/hr/directory",
        ),
      ).toBe("/employee-onboarding");
    });

    it("does not accept a cookie scoped to a different organization", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-2",
            organizationAccess: "active",
            enabledModules: ["hr"],
          }),
          withCookie(gateCookieName("onboarding-done", "user-1--org-1")),
          "/hr/directory",
        ),
      ).toBe("/employee-onboarding");
    });

    it("fires when the DB stamp is absent and no cookie exists (cross-device re-trap without fix)", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
          }),
          noCookies,
          "/hr/directory",
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
          "/org-setup",
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
          "/org-setup",
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
          "/org-setup",
        ),
      ).toBe("/org-setup");
    });
  });

  describe("HR module gate — BUG-018 / BUG-030 / FE-122", () => {
    it("a MEMBER is not gated when the HR module is disabled", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: [],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "/hr/directory",
        ),
      ).toBeNull();
    });

    it("a MEMBER is not gated when enabledModules is absent from the session", () => {
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
          "/hr/directory",
        ),
      ).toBeNull();
    });

    it("a MEMBER with HR enabled and no wizard complete is still sent to /employee-onboarding when navigating to /hr", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "/hr/directory",
        ),
      ).toBe("/employee-onboarding");
    });

    it("a MEMBER with HR enabled may defer and be admitted — BUG-018 / FE-122", () => {
      const userId = "member-1";
      const orgId = "org-1";
      expect(
        resolveWizardGate(
          session({
            orgId,
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: userId,
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          withCookie(gateCookieName("onboarding-deferred", `${userId}--${orgId}`)),
          "/hr/directory",
        ),
      ).toBeNull();
    });
  });

  describe("BUG-A: HR wizard must not intercept non-HR routes", () => {
    it("a MEMBER with HR enabled and incomplete profile navigating to /build/45 is allowed through — BUG-A", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "/build/45",
        ),
      ).toBeNull();
    });

    it("the same MEMBER navigating to /hr/directory IS redirected to /employee-onboarding — BUG-A", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "/hr/directory",
        ),
      ).toBe("/employee-onboarding");
    });

    it("a MEMBER with HR enabled navigating to /settings is allowed through — BUG-A", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "/settings",
        ),
      ).toBeNull();
    });

    it("a MEMBER with HR enabled navigating to /dashboard is allowed through — BUG-A", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "/dashboard",
        ),
      ).toBeNull();
    });
  });

  describe("BUG-B: ORG_ADMIN and MEMBER get identical outcomes — one gate policy", () => {
    const hrMember = (role: "ORG_ADMIN" | "MEMBER") =>
      session({
        orgId: "org-1",
        organizationAccess: "active",
        enabledModules: ["hr"],
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
          role,
          isOrgOwner: false,
        },
      });

    it("ORG_ADMIN navigating to /hr without wizard complete is sent to /employee-onboarding — BUG-B", () => {
      expect(resolveWizardGate(hrMember("ORG_ADMIN"), noCookies, "/hr/team")).toBe("/employee-onboarding");
    });

    it("MEMBER navigating to /hr without wizard complete is sent to /employee-onboarding — BUG-B", () => {
      expect(resolveWizardGate(hrMember("MEMBER"), noCookies, "/hr/team")).toBe("/employee-onboarding");
    });

    it("ORG_ADMIN navigating to /build is allowed through without wizard — BUG-B", () => {
      expect(resolveWizardGate(hrMember("ORG_ADMIN"), noCookies, "/build/1")).toBeNull();
    });

    it("MEMBER navigating to /build is allowed through without wizard — BUG-B", () => {
      expect(resolveWizardGate(hrMember("MEMBER"), noCookies, "/build/1")).toBeNull();
    });
  });

  describe("deferral is available to every non-owner role", () => {
    it("a VIEWER role can defer the wizard and be admitted to /hr", () => {
      const userId = "viewer-1";
      const orgId = "org-1";
      expect(
        resolveWizardGate(
          session({
            orgId,
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: userId,
              email: "viewer@example.com",
              name: "Viewer",
              role: "VIEWER",
              isOrgOwner: false,
            },
          }),
          withCookie(gateCookieName("onboarding-deferred", `${userId}--${orgId}`)),
          "/hr/directory",
        ),
      ).toBeNull();
    });
  });

  describe("path-independent branches still fire on non-HR destinations — proves only branch 5 was scoped", () => {
    it("suspended membership fires on /build", () => {
      expect(
        resolveWizardGate(
          session({ organizationAccess: "suspended" }),
          noCookies,
          "/build/1",
        ),
      ).toBe("/access-suspended");
    });

    it("no-org account fires on /settings", () => {
      expect(resolveWizardGate(session(), noCookies, "/settings")).toBe("/org-setup");
    });

    it("owner with incomplete org setup fires on /dashboard", () => {
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
          "/dashboard",
        ),
      ).toBe("/org-setup");
    });
  });

  describe("cookie max-age constants", () => {
    it("the deferral cookie uses the 7-day max-age, not the 5-minute bridge window", () => {
      expect(ONBOARDING_DEFERRED_MAX_AGE).toBe(7 * 24 * 60 * 60);
    });

    it("the done-bridge cookies keep the 5-minute max-age that guards the session-refresh window", () => {
      expect(GATE_COOKIE_MAX_AGE).toBe(5 * 60);
    });

    it("the deferred max-age is longer than the done max-age", () => {
      expect(ONBOARDING_DEFERRED_MAX_AGE).toBeGreaterThan(GATE_COOKIE_MAX_AGE);
    });
  });

  describe("missing x-pathname header — safe default when proxy is bypassed", () => {
    it("an empty pathname does not trigger the HR wizard gate — failing open keeps the user on their page", () => {
      expect(
        resolveWizardGate(
          session({
            orgId: "org-1",
            organizationAccess: "active",
            enabledModules: ["hr"],
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "MEMBER",
              isOrgOwner: false,
            },
          }),
          noCookies,
          "",
        ),
      ).toBeNull();
    });
  });
});
