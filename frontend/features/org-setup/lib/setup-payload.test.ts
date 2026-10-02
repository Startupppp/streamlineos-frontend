import { MAX_ORG_SETUP_INVITE_BATCHES, MAX_ORG_SETUP_INVITEES } from "@/hooks/api/org-setup-schema";
import { DEFAULT_DATA } from "./constants";
import {
  buildOrgSetupPayload,
  defaultInviteModuleAccess,
  getInviteAccessError,
} from "./setup-payload";
import { parseWizardDraft, type Invitee, type OrgModuleKey, type WizardData } from "./wizard-data-schema";

function wizard(
  invitees: Invitee[],
  modules: OrgModuleKey[] = ["build", "crm", "hr", "chat", "kb"],
): WizardData {
  return {
    ...DEFAULT_DATA,
    goals: ["build"],
    modules,
    installedApps: modules,
    invitees,
  };
}

describe("org setup invitation access", () => {
  it("defaults a Build member to Build only, even when CRM and HR are enabled", () => {
    const data = wizard([{ email: "member@example.com", role: "MEMBER" }]);

    expect(defaultInviteModuleAccess("MEMBER", data.modules)).toEqual([
      { moduleKey: "build", standing: "MEMBER" },
    ]);
    expect(buildOrgSetupPayload(data).invitees).toEqual([
      {
        email: "member@example.com",
        role: "MEMBER",
        moduleAccess: [{ moduleKey: "build", standing: "MEMBER" }],
      },
    ]);
  });

  it("preserves an explicit decision to give a member no product access", () => {
    const data = wizard([
      { email: "member@example.com", role: "MEMBER", moduleAccess: [] },
    ]);

    expect(buildOrgSetupPayload(data).invitees).toEqual([
      { email: "member@example.com", role: "MEMBER", moduleAccess: [] },
    ]);
  });

  it("does not add per-product grants to an Org Admin", () => {
    const data = wizard([{ email: "admin@example.com", role: "ORG_ADMIN" }]);

    expect(buildOrgSetupPayload(data).invitees).toEqual([
      { email: "admin@example.com", role: "ORG_ADMIN" },
    ]);
  });

  it("round trips each invitee's access through a saved wizard draft", () => {
    const data = wizard([
      {
        email: "member@example.com",
        role: "MEMBER",
        moduleAccess: [
          { moduleKey: "build", standing: "ADMIN" },
          { moduleKey: "crm", standing: "MEMBER" },
        ],
      },
    ]);

    const restored = parseWizardDraft(JSON.parse(JSON.stringify(data)));
    expect(restored.invitees[0]?.moduleAccess).toEqual(data.invitees[0]?.moduleAccess);
    expect(buildOrgSetupPayload(restored).invitees?.[0]?.moduleAccess).toEqual(
      data.invitees[0]?.moduleAccess,
    );
  });

  it("blocks a grant when its product was deselected after being configured", () => {
    const data = wizard(
      [{ email: "member@example.com", role: "MEMBER", moduleAccess: [{ moduleKey: "hr", standing: "ADMIN" }] }],
      ["build", "chat", "kb"],
    );

    expect(getInviteAccessError(data)).toMatch(/hr access.*no longer selected/i);
    expect(() => buildOrgSetupPayload(data)).toThrow(/hr access.*no longer selected/i);
  });

  it("rejects duplicate and oversized module grants rather than dropping them", () => {
    const duplicate = wizard([
      {
        email: "member@example.com",
        role: "MEMBER",
        moduleAccess: [
          { moduleKey: "build", standing: "MEMBER" },
          { moduleKey: "build", standing: "ADMIN" },
        ],
      },
    ]);
    expect(getInviteAccessError(duplicate)).toMatch(/invalid module access/i);

    const eleven: OrgModuleKey[] = [
      "build", "crm", "hr", "accounting", "inventory", "support",
      "surveys", "payroll", "sign", "timesheets", "chat",
    ];
    const oversized = wizard(
      [{ email: "member@example.com", role: "MEMBER", moduleAccess: eleven.map((moduleKey) => ({ moduleKey, standing: "MEMBER" })) }],
      eleven,
    );
    expect(getInviteAccessError(oversized)).toMatch(/at most 10/i);
  });

  it("rejects Owner as an invitation role", () => {
    expect(getInviteAccessError(wizard([{ email: "owner@example.com", role: "OWNER" }]))).toMatch(/unavailable organization role/i);
  });

  it("rejects a ninth distinct role and access batch but treats reordered grants as one", () => {
    const keys: OrgModuleKey[] = [
      "build", "crm", "hr", "accounting", "inventory", "support",
      "surveys", "payroll", "sign",
    ];
    const invitees: Invitee[] = keys.map((moduleKey, index) => ({
      email: `member-${index}@example.com`,
      role: "MEMBER",
      moduleAccess: [{ moduleKey, standing: "MEMBER" }],
    }));
    const data = wizard(invitees, keys);

    expect(MAX_ORG_SETUP_INVITE_BATCHES).toBe(8);
    expect(getInviteAccessError({ ...data, invitees: invitees.slice(0, 8) })).toBeNull();
    expect(getInviteAccessError(data)).toMatch(/at most 8 different role and product-access combinations/i);
    expect(() => buildOrgSetupPayload(data)).toThrow(/at most 8 different/i);

    const sameConfiguration = wizard([
      { email: "a@example.com", role: "MEMBER", moduleAccess: [
        { moduleKey: "build", standing: "MEMBER" },
        { moduleKey: "crm", standing: "ADMIN" },
      ] },
      { email: "b@example.com", role: "MEMBER", moduleAccess: [
        { moduleKey: "crm", standing: "ADMIN" },
        { moduleKey: "build", standing: "MEMBER" },
      ] },
    ]);
    expect(getInviteAccessError(sameConfiguration)).toBeNull();
  });

  it("rejects more than the setup invite limit instead of truncating", () => {
    const invitees = Array.from({ length: MAX_ORG_SETUP_INVITEES + 1 }, (_, index) => ({
      email: `member-${index}@example.com`,
      role: "MEMBER",
      moduleAccess: [{ moduleKey: "build", standing: "MEMBER" }],
    } satisfies Invitee));
    const data = wizard(invitees);

    expect(getInviteAccessError(data)).toMatch(/at most 50 people/i);
    expect(() => buildOrgSetupPayload(data)).toThrow(/at most 50 people/i);
  });
});
