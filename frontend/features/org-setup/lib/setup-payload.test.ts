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
  modules: OrgModuleKey[] = ["build", "crm", "hr", "kb"],
): WizardData {
  return {
    ...DEFAULT_DATA,
    industry: "Technology",
    teamSize: "1-10",
    modules,
    installedApps: modules,
    invitees,
  };
}

describe("org setup invitation access", () => {
  it("uses the entered workspace name when no separate company name is given", () => {
    const payload = buildOrgSetupPayload({ ...wizard([]), displayName: "Acme Workspace", teamSize: "1-10", industry: "Agency" });
    expect(payload.companyName).toBe("Acme Workspace");
    expect(payload.companySize).toBe("1-10");
    expect(payload.industry).toBe("Agency");
  });
  it("defaults a MEMBER to MEMBER on every selected module except kb", () => {
    const modules: OrgModuleKey[] = ["build", "crm", "hr", "kb"];
    expect(defaultInviteModuleAccess("MEMBER", modules)).toEqual([
      { moduleKey: "build", standing: "MEMBER" },
      { moduleKey: "crm", standing: "MEMBER" },
      { moduleKey: "hr", standing: "MEMBER" },
    ]);
  });

  it("gives no access when only always-on modules are selected", () => {
    expect(defaultInviteModuleAccess("MEMBER", ["kb"])).toEqual([]);
  });

  it("builds payload with per-module MEMBER access for an hr+crm org", () => {
    const data = wizard(
      [{ email: "member@example.com", role: "MEMBER" }],
      ["hr", "crm", "kb"],
    );
    expect(buildOrgSetupPayload(data).invitees).toEqual([
      {
        email: "member@example.com",
        role: "MEMBER",
        moduleAccess: [
          { moduleKey: "hr", standing: "MEMBER" },
          { moduleKey: "crm", standing: "MEMBER" },
        ],
      },
    ]);
  });

  it("refuses chat and kb grants the server would refuse for the whole invitation batch", () => {
    const data = wizard(
      [
        {
          email: "member@example.com",
          role: "MEMBER",
          moduleAccess: [
            { moduleKey: "hr", standing: "MEMBER" },
            { moduleKey: "kb", standing: "ADMIN" },
          ],
        },
      ],
      ["hr", "kb"],
    );
    expect(getInviteAccessError(data)).toMatch(/kb access, but that product is on for everyone/);
    expect(getInviteAccessError(wizard(
      [{ email: "member@example.com", role: "MEMBER", moduleAccess: [{ moduleKey: "hr", standing: "MEMBER" }] }],
      ["hr", "kb"],
    ))).toBeNull();
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

  it("restores a draft saved while chat was a selectable module without losing the other modules, because chat is part of Home", () => {
    const restored = parseWizardDraft({ ...wizard([]), modules: ["chat", "kb", "hr"] });
    expect(restored.modules).toEqual(["kb", "hr"]);
    expect(buildOrgSetupPayload(restored).enabledModules).toEqual(["kb", "hr"]);
  });

  it("blocks a grant when its product was deselected after being configured", () => {
    const data = wizard(
      [{ email: "member@example.com", role: "MEMBER", moduleAccess: [{ moduleKey: "hr", standing: "ADMIN" }] }],
      ["build", "kb"],
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
      "surveys", "payroll", "sign", "timesheets", "kb",
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

describe("buildOrgSetupPayload — moduleAnswers", () => {
  it("includes non-empty answers for selected modules in the payload", () => {
    const data: WizardData = {
      ...DEFAULT_DATA,
      industry: "Technology",
      teamSize: "1-10",
      modules: ["build", "hr", "kb"],
      installedApps: ["build", "hr", "kb"],
      invitees: [],
      moduleAnswers: {
        build: { workType: "Software", firstProjectName: "Alpha" },
        hr: { employeeCount: "11-50", firstFocus: "" },
      },
    };
    const payload = buildOrgSetupPayload(data);
    expect(payload.moduleAnswers).toEqual({
      build: { workType: "Software", firstProjectName: "Alpha" },
      hr: { employeeCount: "11-50" },
    });
  });

  it("omits moduleAnswers from payload when all answers are empty", () => {
    const data: WizardData = {
      ...DEFAULT_DATA,
      industry: "Technology",
      teamSize: "1-10",
      modules: ["build", "kb"],
      installedApps: ["build", "kb"],
      invitees: [],
      moduleAnswers: { build: { workType: "", firstProjectName: "" } },
    };
    const payload = buildOrgSetupPayload(data);
    expect(payload.moduleAnswers).toBeUndefined();
  });

  it("omits answers for modules not in enabledModules", () => {
    const data: WizardData = {
      ...DEFAULT_DATA,
      industry: "Technology",
      teamSize: "1-10",
      modules: ["crm", "kb"],
      installedApps: ["crm", "kb"],
      invitees: [],
      moduleAnswers: {
        build: { workType: "Software" },
        crm: { salesModel: "B2B" },
      },
    };
    const payload = buildOrgSetupPayload(data);
    expect(payload.moduleAnswers).toEqual({ crm: { salesModel: "B2B" } });
  });
});

describe("buildOrgSetupPayload — required workspace fields", () => {
  it("throws when industry is empty", () => {
    expect(() =>
      buildOrgSetupPayload({ ...wizard([]), industry: "" }),
    ).toThrow("Select an industry before launching.");
  });

  it("throws when teamSize is empty", () => {
    expect(() =>
      buildOrgSetupPayload({ ...wizard([]), teamSize: "" }),
    ).toThrow("Select a team size before launching.");
  });

  it("succeeds when both required fields are present", () => {
    expect(() =>
      buildOrgSetupPayload({ ...wizard([]), industry: "Technology", teamSize: "1-10" }),
    ).not.toThrow();
  });
});
