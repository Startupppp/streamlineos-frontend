import { buildMenuEntries } from "./user-avatar-menu-entries";

const base = {
  canManageSettings: false,
  canViewBilling: false,
  canManagePersonalTokens: false,
  canViewAiCredits: false,
  canSeeOrgPeople: false,
  canManageRbac: false,
  showAccessGroup: false,
};

function hrefs(opts: typeof base): string[] {
  return buildMenuEntries(opts).flatMap((entry) => (entry.kind === "links" ? entry.links.map((l) => l.href) : []));
}

describe("the account menu's Billing & Plan link follows the billing permission", () => {
  it("is hidden from a user who can manage settings but cannot view billing", () => {
    expect(hrefs({ ...base, canManageSettings: true })).not.toContain("/settings/billing");
  });

  it("is shown to a user who can view billing", () => {
    expect(hrefs({ ...base, canViewBilling: true })).toContain("/settings/billing");
  });
});
