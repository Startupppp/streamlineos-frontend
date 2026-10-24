import type { AccessResponse } from "@/types/access";
import { resolveInvitationLanding } from "./invitation-landing";

function access(overrides: Partial<AccessResponse> = {}): AccessResponse {
  return {
    scopes: {},
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    ...overrides,
  };
}

describe("resolveInvitationLanding", () => {
  it("lands a Build member on the dashboard, because build:view is a default member grant (SIGN-017)", () => {
    expect(resolveInvitationLanding(access({
      modules: { build: true },
      scopes: { "build:view": "own" },
    }), null)).toBe("/dashboard");
  });

  it("does not enter Build when the org has disabled it", () => {
    expect(resolveInvitationLanding(access({
      modules: { build: false },
      scopes: { "build:view": "all" },
    }), null)).toBe("/dashboard");
  });

  it("does not enter Build for an unassigned member", () => {
    expect(resolveInvitationLanding(access({ modules: { build: true } }), null))
      .toBe("/dashboard");
  });

  it("does not treat a none scope as Build authorization", () => {
    expect(resolveInvitationLanding(access({
      modules: { build: true },
      scopes: { "build:view": "none" },
    }), null)).toBe("/dashboard");
  });

  it("lands an Org Owner on the dashboard, not in Build", () => {
    expect(resolveInvitationLanding(access({
      isOrgOwner: true,
      modules: { build: true },
    }), null)).toBe("/dashboard");
  });

  it("prioritizes required HR onboarding for a member with effective HR access", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true, build: true },
      scopes: { "hr:access:view": "all", "build:view": "all" },
    }), "/employee-onboarding")).toBe("/employee-onboarding");
  });

  it("skips HR onboarding when HR is enabled but the member has no HR access", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true, build: true },
      scopes: { "build:view": "all" },
    }), "/employee-onboarding")).toBe("/dashboard");
  });

  it("does not force a completed HR joiner back into onboarding", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true, build: true },
      scopes: { "hr:access:view": "all", "build:view": "all" },
    }), null)).toBe("/dashboard");
  });

  it("lands a member without Build in the cross-module dashboard", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true },
      scopes: { "hr:access:view": "all" },
    }), null)).toBe("/dashboard");
  });
});
