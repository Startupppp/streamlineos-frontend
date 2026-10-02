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
  it("lands a Build member in Build when the module and read permission are effective", () => {
    expect(resolveInvitationLanding(access({
      modules: { build: true },
      scopes: { "build:view": "own" },
    }), null)).toBe("/build");
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

  it("lets an Org Owner enter enabled Build through its structural standing", () => {
    expect(resolveInvitationLanding(access({
      isOrgOwner: true,
      modules: { build: true },
    }), null)).toBe("/build");
  });

  it("prioritizes required HR onboarding for a member with effective HR access", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true, build: true },
      scopes: { "hr:access:view": "all", "build:view": "all" },
    }), "/employee-onboarding")).toBe("/employee-onboarding");
  });

  it("skips HR onboarding when HR is enabled but the member has only Build access", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true, build: true },
      scopes: { "build:view": "all" },
    }), "/employee-onboarding")).toBe("/build");
  });

  it("does not force a completed HR joiner back into onboarding", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true, build: true },
      scopes: { "hr:access:view": "all", "build:view": "all" },
    }), null)).toBe("/build");
  });

  it("lands a member without Build in the cross-module dashboard", () => {
    expect(resolveInvitationLanding(access({
      modules: { hr: true },
      scopes: { "hr:access:view": "all" },
    }), null)).toBe("/dashboard");
  });
});
