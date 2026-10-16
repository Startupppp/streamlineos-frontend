import { toAdminWizardDraft } from "./wizard-draft";

describe("toAdminWizardDraft", () => {
  it("does not persist a joining date that is still today", () => {
    expect(toAdminWizardDraft({ joiningDate: new Date() }, 2).joiningDate).toBeUndefined();
  });

  it("persists a joining date the user moved off today", () => {
    const picked = new Date(2026, 0, 5);
    expect(toAdminWizardDraft({ joiningDate: picked }, 2).joiningDate).toBe(picked.toISOString());
  });
});
