import { formatActionLabel } from "./audit-log-constants";

describe("formatActionLabel uses one object-then-verb sentence-case pattern", () => {
  it.each([
    ["org.costCenter.created", "Cost center created"],
    ["org.costCenter.archived", "Cost center archived"],
    ["org.team.created", "Team created"],
    ["org.branch.archived", "Branch archived"],
    ["org.businessUnit.updated", "Business unit updated"],
    ["org.member_role_changed", "Member role changed"],
    ["settings.updated", "Settings updated"],
    ["security_settings.updated", "Security settings updated"],
    ["principal_group.created", "Principal group created"],
    ["api_key.revoked", "API key revoked"],
    ["org.archived", "Organization archived"],
    ["org.holiday.created", "Holiday added"],
    ["user.login", "Signed in"],
  ])("labels %s as %s", (action, label) => {
    expect(formatActionLabel(action)).toBe(label);
  });

  it("never renders the em-dash separated or title-cased legacy form", () => {
    const label = formatActionLabel("org.costCenter.created");
    expect(label).not.toContain("—");
    expect(label).not.toBe("Org — CostCenter — Created");
  });
});
